-- Add quick_emoji column to conversations table (shared between participants)
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS quick_emoji TEXT DEFAULT '👌';

-- Create RPC to update conversation quick emoji
CREATE OR REPLACE FUNCTION public.update_conversation_quick_emoji(p_conversation_id uuid, p_quick_emoji text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
BEGIN
  -- Check if user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant of this conversation';
  END IF;

  -- Update the conversation quick emoji
  UPDATE conversations 
  SET quick_emoji = p_quick_emoji, updated_at = now()
  WHERE id = p_conversation_id
  RETURNING json_build_object(
    'id', id,
    'quick_emoji', quick_emoji,
    'updated_at', updated_at
  ) INTO v_result;

  RETURN v_result;
END;
$function$;