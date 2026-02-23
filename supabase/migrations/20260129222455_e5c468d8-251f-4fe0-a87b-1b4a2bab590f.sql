-- Drop the conflicting/complex SELECT policies and create a simpler one
DROP POLICY IF EXISTS "participants_can_select_messages" ON public.messages;
DROP POLICY IF EXISTS "users_can_view_messages" ON public.messages;

-- Create a single, clear SELECT policy for messages
CREATE POLICY "users_can_view_their_messages" ON public.messages
FOR SELECT USING (
  -- User is a participant in the conversation
  (conversation_id IS NOT NULL AND is_conversation_participant(conversation_id))
  OR 
  -- Legacy: Direct messages without conversation_id (sender or receiver)
  (conversation_id IS NULL AND (auth.uid() = sender_id OR auth.uid() = receiver_id))
);