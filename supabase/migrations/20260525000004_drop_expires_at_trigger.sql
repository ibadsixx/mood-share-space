-- Drop the trigger and function that reference expires_at (column doesn't exist)
DROP TRIGGER IF EXISTS set_message_expires_at_trigger ON public.messages;
DROP FUNCTION IF EXISTS public.set_message_expires_at();
DROP FUNCTION IF EXISTS public.delete_expired_messages();

-- Remove the cron job that called the expired messages Edge Function
SELECT cron.unschedule('delete-expired-messages');

-- Recreate delete_read_vanish_messages without depending on vanish_on_read column.
-- Instead, it checks conversation_settings directly to see if vanish was enabled.
DROP FUNCTION IF EXISTS public.delete_read_vanish_messages(UUID);

CREATE OR REPLACE FUNCTION public.delete_read_vanish_messages(p_conversation_id UUID)
RETURNS TABLE(deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID;
  v_count BIGINT;
BEGIN
  v_current_user := auth.uid();

  -- Only proceed if both participants have vanish mode enabled
  -- (safety check: only delete messages where the sender had vanish on)
  WITH deleted AS (
    DELETE FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND EXISTS (
        SELECT 1 FROM public.conversation_settings cs
        WHERE cs.conversation_id = p_conversation_id
          AND cs.user_id = m.sender_id
          AND cs.vanishing_messages_enabled = TRUE
      )
      AND EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = p_conversation_id
          AND cp.user_id = v_current_user
      )
      AND (
        -- Message was sent by the other user and read by current user
        (m.sender_id != v_current_user
         AND EXISTS (
           SELECT 1 FROM public.message_reads mr
           WHERE mr.message_id = m.id
             AND mr.user_id = v_current_user
         ))
        OR
        -- Message was sent by current user and read by the other user
        (m.sender_id = v_current_user
         AND EXISTS (
           SELECT 1 FROM public.message_reads mr
           JOIN public.conversation_participants cp ON cp.user_id = mr.user_id
           WHERE mr.message_id = m.id
             AND cp.conversation_id = p_conversation_id
             AND mr.user_id != v_current_user
         ))
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted;

  RETURN QUERY SELECT v_count AS deleted_count;
END;
$$;
