-- Drop the existing function first
DROP FUNCTION IF EXISTS public.update_conversation_settings(UUID, BOOLEAN, BOOLEAN, INTEGER, BOOLEAN, TEXT);

-- Add quick_emoji column if it doesn't exist (might have been added already)
ALTER TABLE public.conversation_settings 
ADD COLUMN IF NOT EXISTS quick_emoji TEXT DEFAULT '👌';

-- Recreate the RPC function with quick_emoji support
CREATE OR REPLACE FUNCTION public.update_conversation_settings(
  p_conversation_id UUID,
  p_is_muted BOOLEAN DEFAULT NULL,
  p_vanishing_messages_enabled BOOLEAN DEFAULT NULL,
  p_vanishing_messages_duration INTEGER DEFAULT NULL,
  p_read_receipts_enabled BOOLEAN DEFAULT NULL,
  p_quick_emoji TEXT DEFAULT NULL
)
RETURNS public.conversation_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.conversation_settings;
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update only the fields that were provided
  UPDATE public.conversation_settings
  SET
    is_muted = COALESCE(p_is_muted, is_muted),
    vanishing_messages_enabled = COALESCE(p_vanishing_messages_enabled, vanishing_messages_enabled),
    vanishing_messages_duration = COALESCE(p_vanishing_messages_duration, vanishing_messages_duration),
    read_receipts_enabled = COALESCE(p_read_receipts_enabled, read_receipts_enabled),
    quick_emoji = COALESCE(p_quick_emoji, quick_emoji),
    updated_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id
  RETURNING * INTO v_result;

  -- If no row was updated, create one
  IF v_result IS NULL THEN
    INSERT INTO public.conversation_settings (
      conversation_id,
      user_id,
      is_muted,
      vanishing_messages_enabled,
      vanishing_messages_duration,
      read_receipts_enabled,
      quick_emoji
    )
    VALUES (
      p_conversation_id,
      v_user_id,
      COALESCE(p_is_muted, false),
      COALESCE(p_vanishing_messages_enabled, false),
      COALESCE(p_vanishing_messages_duration, 86400),
      COALESCE(p_read_receipts_enabled, true),
      COALESCE(p_quick_emoji, '👌')
    )
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;