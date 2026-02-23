-- Fix infinite recursion in conversation_participants RLS policies
-- First, drop the problematic policy
DROP POLICY IF EXISTS "participants_can_view_participants" ON conversation_participants;

-- Create a security definer function to check if user is participant
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id 
    AND cp.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create new policy using the security definer function
CREATE POLICY "participants_can_view_participants" 
ON conversation_participants 
FOR SELECT 
USING (public.is_conversation_participant(conversation_id));

-- Also fix the messages policy that might have similar issues
DROP POLICY IF EXISTS "participants_can_select_messages" ON messages;

CREATE POLICY "participants_can_select_messages" 
ON messages 
FOR SELECT 
USING (
  conversation_id IS NOT NULL 
  AND public.is_conversation_participant(conversation_id)
);

-- Fix the insert policy for messages as well
DROP POLICY IF EXISTS "participants_can_insert_messages" ON messages;

CREATE POLICY "participants_can_insert_messages" 
ON messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() 
  AND conversation_id IS NOT NULL 
  AND public.is_conversation_participant(conversation_id)
  AND NOT EXISTS (
    SELECT 1 FROM blocks b
    JOIN conversation_participants cp ON cp.conversation_id = messages.conversation_id
    WHERE cp.user_id != auth.uid()
    AND ((b.blocker_id = auth.uid() AND b.blocked_id = cp.user_id)
         OR (b.blocker_id = cp.user_id AND b.blocked_id = auth.uid()))
  )
);