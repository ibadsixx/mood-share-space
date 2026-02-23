-- Direct Messaging System with Conversations
-- Drop existing constraints if they exist and recreate tables

-- First, create the conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'dm', -- 'dm' for 1:1; may support 'group' later
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create conversation participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

-- Update the existing messages table to use conversations instead of direct sender/receiver
ALTER TABLE messages DROP COLUMN IF EXISTS receiver_id;
ALTER TABLE messages DROP COLUMN IF EXISTS read;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

-- Create message_reads table for tracking read status per user
CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

-- Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "participants_can_select_conversation" ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "users_can_insert_conversation" ON conversations FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "creators_can_update_conversation" ON conversations FOR UPDATE
USING (created_by = auth.uid());

-- RLS Policies for conversation_participants
CREATE POLICY "participants_can_view_participants" ON conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
  )
);

CREATE POLICY "users_can_join_conversation" ON conversation_participants FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND c.created_by = auth.uid()
  )
);

-- Update existing messages RLS policies
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;

CREATE POLICY "participants_can_select_messages" ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "participants_can_insert_messages" ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM blocks b
    JOIN conversation_participants cp ON cp.conversation_id = messages.conversation_id
    WHERE cp.user_id != auth.uid()
      AND ((b.blocker_id = auth.uid() AND b.blocked_id = cp.user_id)
           OR (b.blocker_id = cp.user_id AND b.blocked_id = auth.uid()))
  )
);

-- RLS Policies for message_reads
CREATE POLICY "users_can_manage_own_reads" ON message_reads FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

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

-- Add realtime publication for new tables
ALTER publication supabase_realtime ADD TABLE conversations;
ALTER publication supabase_realtime ADD TABLE conversation_participants;
ALTER publication supabase_realtime ADD TABLE message_reads;

-- Set replica identity for realtime
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE conversation_participants REPLICA IDENTITY FULL;
ALTER TABLE message_reads REPLICA IDENTITY FULL;