-- Create story mentions table
CREATE TABLE IF NOT EXISTS public.story_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position_x DECIMAL(5,2), -- Position for tap-to-reveal (0-100%)
  position_y DECIMAL(5,2), -- Position for tap-to-reveal (0-100%)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_mentions ENABLE ROW LEVEL SECURITY;

-- RLS policies for story mentions
CREATE POLICY "Anyone can view story mentions"
  ON public.story_mentions FOR SELECT
  USING (true);

CREATE POLICY "Users can create mentions in their stories"
  ON public.story_mentions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete mentions from their stories"
  ON public.story_mentions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_id AND user_id = auth.uid()
    )
  );

-- Create story polls table
CREATE TABLE IF NOT EXISTS public.story_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of option strings
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_options CHECK (jsonb_array_length(options) BETWEEN 2 AND 4)
);

-- Enable RLS
ALTER TABLE public.story_polls ENABLE ROW LEVEL SECURITY;

-- RLS policies for polls
CREATE POLICY "Anyone can view polls"
  ON public.story_polls FOR SELECT
  USING (true);

CREATE POLICY "Users can create polls in their stories"
  ON public.story_polls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_id AND user_id = auth.uid()
    )
  );

-- Create story poll votes table
CREATE TABLE IF NOT EXISTS public.story_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.story_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id) -- One vote per user per poll
);

-- Enable RLS
ALTER TABLE public.story_poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for poll votes
CREATE POLICY "Anyone can view poll votes"
  ON public.story_poll_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.story_poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON public.story_poll_votes FOR UPDATE
  USING (auth.uid() = user_id);

-- Create story questions table
CREATE TABLE IF NOT EXISTS public.story_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_questions ENABLE ROW LEVEL SECURITY;

-- RLS policies for questions
CREATE POLICY "Anyone can view questions"
  ON public.story_questions FOR SELECT
  USING (true);

CREATE POLICY "Users can create questions in their stories"
  ON public.story_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_id AND user_id = auth.uid()
    )
  );

-- Create story question responses table
CREATE TABLE IF NOT EXISTS public.story_question_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.story_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_question_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for question responses
CREATE POLICY "Story owner can view responses"
  ON public.story_question_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.story_questions sq
      JOIN public.stories s ON s.id = sq.story_id
      WHERE sq.id = question_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own responses"
  ON public.story_question_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can respond"
  ON public.story_question_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_story_mentions_story_id ON public.story_mentions(story_id);
CREATE INDEX idx_story_mentions_mentioned_user ON public.story_mentions(mentioned_user_id);
CREATE INDEX idx_story_polls_story_id ON public.story_polls(story_id);
CREATE INDEX idx_story_poll_votes_poll_id ON public.story_poll_votes(poll_id);
CREATE INDEX idx_story_questions_story_id ON public.story_questions(story_id);
CREATE INDEX idx_story_question_responses_question_id ON public.story_question_responses(question_id);