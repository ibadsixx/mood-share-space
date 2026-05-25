-- Drop old trigger and functions that reference expires_at (column doesn't exist)
DROP TRIGGER IF EXISTS set_message_expires_at_trigger ON public.messages;
DROP FUNCTION IF EXISTS public.set_message_expires_at();
DROP FUNCTION IF EXISTS public.delete_expired_messages();
SELECT cron.unschedule('delete-expired-messages');

-- Add vanishing_sent column: records whether vanish mode was enabled when message was sent
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS vanishing_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_messages_vanishing_sent
  ON public.messages(vanishing_sent)
  WHERE vanishing_sent = TRUE;

-- Trigger: auto-set vanishing_sent = TRUE on INSERT when sender has vanish mode enabled
CREATE OR REPLACE FUNCTION public.set_vanishing_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vanishing_enabled BOOLEAN;
BEGIN
  SELECT cs.vanishing_messages_enabled INTO v_vanishing_enabled
  FROM public.conversation_settings cs
  WHERE cs.conversation_id = NEW.conversation_id
    AND cs.user_id = NEW.sender_id;

  IF v_vanishing_enabled THEN
    NEW.vanishing_sent = TRUE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER set_vanishing_sent_trigger
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_vanishing_sent();

-- RPC: delete read vanish-mode messages (called when user disables vanish mode)
DROP FUNCTION IF EXISTS public.delete_read_vanish_messages(UUID);

CREATE OR REPLACE FUNCTION public.delete_read_vanish_messages(p_conversation_id UUID)
RETURNS TABLE(deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND m.vanishing_sent = TRUE
      AND EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = p_conversation_id
          AND cp.user_id != m.sender_id
          AND EXISTS (
            SELECT 1 FROM public.message_reads mr
            WHERE mr.message_id = m.id
              AND mr.user_id = cp.user_id
          )
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted;

  RETURN QUERY SELECT v_count AS deleted_count;
END;
$$;
