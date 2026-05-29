-- Limit channel replies to one level deep (only reply to top-level posts, not other replies)
CREATE OR REPLACE FUNCTION public.send_channel_reply(
  p_conversation_id UUID,
  p_reply_to_id UUID,
  p_content TEXT,
  p_sender_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg_id UUID;
  v_user_id UUID;
  v_conv_type TEXT;
  v_target_reply_to UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_sender_id != v_user_id THEN
    RAISE EXCEPTION 'Sender ID does not match authenticated user';
  END IF;

  SELECT c.type INTO v_conv_type
  FROM conversations c
  WHERE c.id = p_conversation_id;

  IF v_conv_type != 'channel' THEN
    RAISE EXCEPTION 'Only available for channels';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You are not a participant';
  END IF;

  IF p_content IS NULL OR p_content = '' THEN
    RAISE EXCEPTION 'Reply content is required';
  END IF;

  -- Verify the reply target exists in the same conversation and is a top-level post
  SELECT m.reply_to_id INTO v_target_reply_to
  FROM messages m
  WHERE m.id = p_reply_to_id AND m.conversation_id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Only allow replying to top-level messages (no nested replies)
  IF v_target_reply_to IS NOT NULL THEN
    RAISE EXCEPTION 'Can only reply to top-level posts, not other replies';
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, reply_to_id, message_type)
  VALUES (p_conversation_id, p_sender_id, p_content, p_reply_to_id, 'text')
  RETURNING id INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;
