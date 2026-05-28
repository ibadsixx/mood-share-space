-- Create conversation_clears table for soft-delete "clear conversation"
-- Instead of hard-deleting messages from the DB, we record when a user cleared
-- the conversation. Messages older than that timestamp are hidden from that user.
-- The other participant's view is unaffected.

CREATE TABLE public.conversation_clears (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  cleared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

ALTER TABLE public.conversation_clears ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversation clears"
ON public.conversation_clears FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_conversation_clears_user ON public.conversation_clears(user_id);
CREATE INDEX idx_conversation_clears_conversation ON public.conversation_clears(conversation_id);
