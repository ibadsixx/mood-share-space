-- Add RPCs and realtime setup for messaging system

-- Create RPC to get or create a DM conversation
CREATE OR REPLACE FUNCTION get_or_create_dm(p_user_a uuid, p_user_b uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_current_user uuid;
BEGIN
  -- Get current authenticated user
  v_current_user := auth.uid();
  
  -- Validate that the current user is one of the participants
  IF v_current_user != p_user_a AND v_current_user != p_user_b THEN
    RAISE EXCEPTION 'Unauthorized: You can only create conversations you participate in';
  END IF;
  
  -- Check if either user is blocked
  IF EXISTS (
    SELECT 1 FROM blocks 
    WHERE (blocker_id = p_user_a AND blocked_id = p_user_b)
       OR (blocker_id = p_user_b AND blocked_id = p_user_a)
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation: users are blocked';
  END IF;
  
  -- Look for existing conversation between these two users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'dm'
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = p_user_a
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2  
      WHERE cp2.conversation_id = c.id AND cp2.user_id = p_user_b
    )
    AND (
      SELECT COUNT(*) FROM conversation_participants cp
      WHERE cp.conversation_id = c.id
    ) = 2
  LIMIT 1;
  
  -- If no conversation exists, create one
  IF v_conversation_id IS NULL THEN
    -- Create new conversation
    INSERT INTO conversations (type, created_by)
    VALUES ('dm', v_current_user)
    RETURNING id INTO v_conversation_id;
    
    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
      (v_conversation_id, p_user_a),
      (v_conversation_id, p_user_b);
  END IF;
  
  RETURN v_conversation_id;
END;
$$;

-- Create RPC to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user uuid;
BEGIN
  v_current_user := auth.uid();
  
  -- Verify user is participant in conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = v_current_user
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You are not a participant in this conversation';
  END IF;
  
  -- Insert read records for all unread messages in this conversation
  INSERT INTO message_reads (message_id, user_id)
  SELECT m.id, v_current_user
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != v_current_user -- Don't mark own messages as read
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr
      WHERE mr.message_id = m.id AND mr.user_id = v_current_user
    )
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$;

-- Create function to get unread count for a conversation
CREATE OR REPLACE FUNCTION get_unread_count(p_conversation_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id -- Don't count own messages
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr
      WHERE mr.message_id = m.id AND mr.user_id = p_user_id
    );
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to get conversations with unread counts and last message
CREATE OR REPLACE FUNCTION get_conversations_with_info(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  conversation_id uuid,
  type text,
  created_at timestamptz,
  updated_at timestamptz,
  other_user_id uuid,
  other_user_username text,
  other_user_display_name text,
  other_user_profile_pic text,
  last_message_content text,
  last_message_created_at timestamptz,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as conversation_id,
    c.type,
    c.created_at,
    c.updated_at,
    other_participant.user_id as other_user_id,
    p.username as other_user_username,
    p.display_name as other_user_display_name,
    p.profile_pic as other_user_profile_pic,
    last_msg.content as last_message_content,
    last_msg.created_at as last_message_created_at,
    COALESCE(unread.count, 0) as unread_count
  FROM conversations c
  JOIN conversation_participants my_participation ON my_participation.conversation_id = c.id AND my_participation.user_id = p_user_id
  JOIN conversation_participants other_participant ON other_participant.conversation_id = c.id AND other_participant.user_id != p_user_id
  JOIN profiles p ON p.id = other_participant.user_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at
    FROM messages m 
    WHERE m.conversation_id = c.id 
    ORDER BY m.created_at DESC 
    LIMIT 1
  ) last_msg ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id != p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM message_reads mr
        WHERE mr.message_id = m.id AND mr.user_id = p_user_id
      )
  ) unread ON true
  ORDER BY GREATEST(c.updated_at, last_msg.created_at) DESC NULLS LAST;
END;
$$;

-- Add realtime publication for new tables
ALTER publication supabase_realtime ADD TABLE conversations;
ALTER publication supabase_realtime ADD TABLE conversation_participants;  
ALTER publication supabase_realtime ADD TABLE message_reads;

-- Set replica identity for realtime
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE conversation_participants REPLICA IDENTITY FULL;
ALTER TABLE message_reads REPLICA IDENTITY FULL;