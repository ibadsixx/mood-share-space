-- Direct Messaging System with Conversations - Fix existing dependencies
-- First, drop existing RLS policies that depend on receiver_id

DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;

-- Now we can safely drop the columns
ALTER TABLE messages DROP COLUMN IF EXISTS receiver_id;
ALTER TABLE messages DROP COLUMN IF EXISTS read;

-- Add new columns for conversation-based messaging
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

-- Create the conversations table
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

-- New RLS policies for messages using conversations
CREATE POLICY "participants_can_select_messages" ON messages FOR SELECT
USING (
  conversation_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "participants_can_insert_messages" ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND conversation_id IS NOT NULL
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