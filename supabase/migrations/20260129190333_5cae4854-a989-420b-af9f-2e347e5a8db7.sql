-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reactions on messages in their conversations
CREATE POLICY "Users can view message reactions"
ON public.message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_reactions.message_id
    AND (
      m.sender_id = auth.uid() 
      OR m.receiver_id = auth.uid()
      OR (m.conversation_id IS NOT NULL AND is_conversation_participant(m.conversation_id))
    )
  )
);

-- Policy: Users can add reactions to messages in their conversations
CREATE POLICY "Users can add message reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_reactions.message_id
    AND (
      m.sender_id = auth.uid() 
      OR m.receiver_id = auth.uid()
      OR (m.conversation_id IS NOT NULL AND is_conversation_participant(m.conversation_id))
    )
  )
);

-- Policy: Users can update their own reactions
CREATE POLICY "Users can update their own message reactions"
ON public.message_reactions
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own reactions
CREATE POLICY "Users can delete their own message reactions"
ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions(user_id);