-- The SECURITY DEFINER RPCs (vote_on_poll, get_message_poll) bypass RLS,
-- and the explicit permission checks inside them are the real security boundary.
-- These RLS policies are dead code.
DROP POLICY IF EXISTS "Participants can vote" ON public.message_poll_votes;
DROP POLICY IF EXISTS "Participants can insert votes" ON public.message_poll_votes;
