-- Add chat_theme column to conversations table (shared between participants)
ALTER TABLE public.conversations 
ADD COLUMN chat_theme text NOT NULL DEFAULT 'default';

-- Create function to update conversation theme (accessible by participants)
CREATE OR REPLACE FUNCTION public.update_conversation_theme(
  p_conversation_id uuid,
  p_chat_theme text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Update the conversation theme
  UPDATE conversations 
  SET chat_theme = p_chat_theme, updated_at = now()
  WHERE id = p_conversation_id
  RETURNING json_build_object(
    'id', id,
    'chat_theme', chat_theme,
    'updated_at', updated_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;