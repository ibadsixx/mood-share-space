-- Create story_reactions table for emoji reactions on stories
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id, emoji)
);

-- Enable RLS on story_reactions
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

-- Story reactions are viewable by everyone
CREATE POLICY "Story reactions are viewable by everyone"
ON public.story_reactions
FOR SELECT
USING (true);

-- Users can add reactions to stories
CREATE POLICY "Users can add reactions to stories"
ON public.story_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
ON public.story_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Add music_url to stories table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stories' 
    AND column_name = 'music_url'
  ) THEN
    ALTER TABLE public.stories ADD COLUMN music_url TEXT;
  END IF;
END $$;

-- Add music_title to stories table for displaying music info
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stories' 
    AND column_name = 'music_title'
  ) THEN
    ALTER TABLE public.stories ADD COLUMN music_title TEXT;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_story_reactions_story_id ON public.story_reactions(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_user_id ON public.story_reactions(user_id);