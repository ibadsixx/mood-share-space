-- Fix messages table to make receiver_id nullable for conversation-based messaging
-- This allows messages to work properly with the conversation system

ALTER TABLE messages 
ALTER COLUMN receiver_id DROP NOT NULL;

-- Update the RLS policies to handle both direct messages and conversation messages properly
DROP POLICY IF EXISTS "Users can send direct messages to friends or via conversation" ON messages;
DROP POLICY IF EXISTS "Users can view their messages" ON messages;

-- Create updated policies that work with both direct and conversation messages
CREATE POLICY "users_can_insert_messages" 
ON messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() 
  AND (
    -- For conversation messages
    (conversation_id IS NOT NULL AND public.is_conversation_participant(conversation_id))
    OR
    -- For direct messages (legacy support)
    (receiver_id IS NOT NULL AND are_users_friends(sender_id, receiver_id))
  )
  AND NOT EXISTS (
    SELECT 1 FROM blocks b
    WHERE (b.blocker_id = sender_id AND b.blocked_id = receiver_id)
       OR (b.blocker_id = receiver_id AND b.blocked_id = sender_id)
  )
);

CREATE POLICY "users_can_view_messages" 
ON messages 
FOR SELECT 
USING (
  (
    -- For conversation messages - check if user is participant
    (conversation_id IS NOT NULL AND public.is_conversation_participant(conversation_id))
    OR
    -- For direct messages - check if user is sender or receiver
    (receiver_id IS NOT NULL AND (auth.uid() = sender_id OR auth.uid() = receiver_id))
  )
  AND NOT EXISTS (
    SELECT 1 FROM blocks b
    WHERE (b.blocker_id = auth.uid() AND b.blocked_id = sender_id)
       OR (b.blocker_id = sender_id AND b.blocked_id = auth.uid())
       OR (receiver_id IS NOT NULL AND (
         (b.blocker_id = auth.uid() AND b.blocked_id = receiver_id)
         OR (b.blocker_id = receiver_id AND b.blocked_id = auth.uid())
       ))
  )
);