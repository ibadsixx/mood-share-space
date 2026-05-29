-- Add poll/vote and limited reply support for channels
-- 1. Add 'poll' message type
-- 2. Create message_polls table
-- 3. Create message_poll_votes table
-- 4. Create poll RPCs
-- 5. Update reply logic for channel followers

-- Add poll to message_type_enum
ALTER TYPE message_type_enum ADD VALUE IF NOT EXISTS 'poll';

-- Message polls table
CREATE TABLE IF NOT EXISTS public.message_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_options CHECK (jsonb_array_length(options) BETWEEN 2 AND 10)
);

-- Poll votes table (one vote per user per poll)
CREATE TABLE IF NOT EXISTS public.message_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.message_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.message_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS: anyone can read polls (they're part of messages)
CREATE POLICY "Anyone can read polls"
  ON public.message_polls FOR SELECT
  USING (true);

-- RLS: only conversation participants can vote
CREATE POLICY "Participants can vote"
  ON public.message_poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN messages m ON m.conversation_id = cp.conversation_id
      WHERE m.id = (SELECT message_id FROM message_polls WHERE id = message_poll_votes.poll_id)
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can insert votes"
  ON public.message_poll_votes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN messages m ON m.conversation_id = cp.conversation_id
      WHERE m.id = (SELECT message_id FROM message_polls WHERE id = poll_id)
        AND cp.user_id = auth.uid()
    )
  );

-- Send a poll message (publishers/moderators only)
CREATE OR REPLACE FUNCTION public.send_poll_message(
  p_conversation_id UUID,
  p_question TEXT,
  p_options JSONB,
  p_sender_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg_id UUID;
  v_user_id UUID;
  v_role TEXT;
  v_conv_type TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check conversation type and user role
  SELECT c.type INTO v_conv_type
  FROM conversations c
  WHERE c.id = p_conversation_id;

  IF v_conv_type = 'channel' THEN
    SELECT cp.role INTO v_role
    FROM conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_user_id;

    IF v_role IS NULL OR v_role NOT IN ('owner', 'moderator') THEN
      RAISE EXCEPTION 'Only channel owners and moderators can create polls';
    END IF;
  END IF;

  -- Validate
  IF p_question IS NULL OR p_question = '' THEN
    RAISE EXCEPTION 'Poll question is required';
  END IF;

  IF jsonb_array_length(p_options) < 2 THEN
    RAISE EXCEPTION 'At least 2 options are required';
  END IF;

  IF jsonb_array_length(p_options) > 10 THEN
    RAISE EXCEPTION 'Maximum 10 options allowed';
  END IF;

  -- Insert the message
  INSERT INTO public.messages (conversation_id, sender_id, content, message_type)
  VALUES (p_conversation_id, p_sender_id, p_question, 'poll')
  RETURNING id INTO v_msg_id;

  -- Insert the poll
  INSERT INTO public.message_polls (message_id, question, options)
  VALUES (v_msg_id, p_question, p_options);

  RETURN v_msg_id;
END;
$$;

-- Get poll data for a message
CREATE OR REPLACE FUNCTION public.get_message_poll(
  p_message_id UUID
)
RETURNS TABLE (
  poll_id UUID,
  question TEXT,
  options JSONB,
  total_votes BIGINT,
  vote_counts JSONB,
  user_vote INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  SELECT
    mp.id as poll_id,
    mp.question,
    mp.options,
    COALESCE(v.total, 0)::BIGINT as total_votes,
    COALESCE(v.counts, '{}'::jsonb) as vote_counts,
    uv.option_index as user_vote
  FROM message_polls mp
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::BIGINT as total,
      jsonb_object_agg(option_index::TEXT, cnt) as counts
    FROM (
      SELECT option_index, COUNT(*) as cnt
      FROM message_poll_votes
      WHERE poll_id = mp.id
      GROUP BY option_index
    ) sub
  ) v ON true
  LEFT JOIN LATERAL (
    SELECT option_index
    FROM message_poll_votes
    WHERE poll_id = mp.id AND user_id = v_user_id
    LIMIT 1
  ) uv ON true
  WHERE mp.message_id = p_message_id;
END;
$$;

-- Vote on a poll
CREATE OR REPLACE FUNCTION public.vote_on_poll(
  p_poll_id UUID,
  p_option_index INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_msg_id UUID;
  v_conv_id UUID;
  v_num_options INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get poll info
  SELECT mp.message_id, jsonb_array_length(mp.options) INTO v_msg_id, v_num_options
  FROM message_polls mp
  WHERE mp.id = p_poll_id;

  IF v_msg_id IS NULL THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  IF p_option_index < 0 OR p_option_index >= v_num_options THEN
    RAISE EXCEPTION 'Invalid option';
  END IF;

  -- Get conversation id and check participation
  SELECT m.conversation_id INTO v_conv_id
  FROM messages m
  WHERE m.id = v_msg_id;

  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = v_conv_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You are not a participant';
  END IF;

  -- Upsert vote (one vote per user)
  INSERT INTO public.message_poll_votes (poll_id, user_id, option_index)
  VALUES (p_poll_id, v_user_id, p_option_index)
  ON CONFLICT (poll_id, user_id)
  DO UPDATE SET option_index = p_option_index, created_at = now();
END;
$$;

-- Send a reply in a channel (any participant including followers)
CREATE OR REPLACE FUNCTION public.send_channel_reply(
  p_conversation_id UUID,
  p_reply_to_id UUID,
  p_content TEXT,
  p_sender_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg_id UUID;
  v_user_id UUID;
  v_conv_type TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.type INTO v_conv_type
  FROM conversations c
  WHERE c.id = p_conversation_id;

  IF v_conv_type != 'channel' THEN
    RAISE EXCEPTION 'Only available for channels';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You are not a participant';
  END IF;

  IF p_content IS NULL OR p_content = '' THEN
    RAISE EXCEPTION 'Reply content is required';
  END IF;

  -- Verify the reply target exists in the same conversation
  IF NOT EXISTS (
    SELECT 1 FROM messages
    WHERE id = p_reply_to_id AND conversation_id = p_conversation_id
  ) THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, reply_to_id, message_type)
  VALUES (p_conversation_id, p_sender_id, p_content, p_reply_to_id, 'text')
  RETURNING id INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;
