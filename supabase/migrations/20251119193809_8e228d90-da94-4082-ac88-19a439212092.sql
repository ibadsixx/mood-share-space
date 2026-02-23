-- Create music_library table to store all music tracks dynamically
CREATE TABLE IF NOT EXISTS public.music_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  artist TEXT,
  duration INTEGER, -- in seconds
  source_type TEXT NOT NULL, -- youtube, soundcloud, spotify, direct_audio, etc.
  thumbnail_url TEXT,
  video_id TEXT, -- for YouTube
  usage_count INTEGER NOT NULL DEFAULT 1,
  is_trending BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.music_library ENABLE ROW LEVEL SECURITY;

-- Anyone can view the music library
CREATE POLICY "Music library is viewable by everyone"
ON public.music_library
FOR SELECT
USING (true);

-- Authenticated users can add to the music library
CREATE POLICY "Authenticated users can add music"
ON public.music_library
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Only the creator can update their music entries
CREATE POLICY "Users can update their music entries"
ON public.music_library
FOR UPDATE
USING (auth.uid() = created_by);

-- Create an index on usage_count for trending queries
CREATE INDEX idx_music_library_usage_count ON public.music_library(usage_count DESC);
CREATE INDEX idx_music_library_trending ON public.music_library(is_trending, usage_count DESC);
CREATE INDEX idx_music_library_source ON public.music_library(source_type);

-- Create a function to update trending status
CREATE OR REPLACE FUNCTION update_music_trending_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark songs as trending if usage_count >= 10
  UPDATE public.music_library
  SET is_trending = true
  WHERE usage_count >= 10 AND is_trending = false;
  
  -- Remove trending status if usage_count < 10
  UPDATE public.music_library
  SET is_trending = false
  WHERE usage_count < 10 AND is_trending = true;
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_music_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER music_library_updated_at
BEFORE UPDATE ON public.music_library
FOR EACH ROW
EXECUTE FUNCTION update_music_updated_at();