-- Add message_poll_votes to realtime publication so poll results update in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_poll_votes;
ALTER TABLE public.message_poll_votes REPLICA IDENTITY FULL;
