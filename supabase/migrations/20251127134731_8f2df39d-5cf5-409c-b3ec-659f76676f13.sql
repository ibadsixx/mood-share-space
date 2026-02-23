-- Create music_usage table to track when users use tracks
CREATE TABLE IF NOT EXISTS public.music_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  music_id UUID NOT NULL REFERENCES public.music_library(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for music_usage
CREATE POLICY "Users can insert their own music usage"
ON public.music_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Music usage is viewable by everyone"
ON public.music_usage
FOR SELECT
USING (true);

CREATE POLICY "Users can delete their own music usage"
ON public.music_usage
FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_music_library_url ON public.music_library(lower(url));
CREATE INDEX IF NOT EXISTS idx_music_library_video_id ON public.music_library(video_id);
CREATE INDEX IF NOT EXISTS idx_music_library_source_type ON public.music_library(source_type);
CREATE INDEX IF NOT EXISTS idx_music_usage_music_id ON public.music_usage(music_id);
CREATE INDEX IF NOT EXISTS idx_music_usage_user_id ON public.music_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_music_usage_used_at ON public.music_usage(used_at);

-- Drop old function if exists and recreate with proper JSON response
DROP FUNCTION IF EXISTS public.increment_music_usage(UUID);

-- Create new function that handles music add/increment and returns proper JSON
CREATE OR REPLACE FUNCTION public.add_or_increment_music(
  p_url TEXT,
  p_title TEXT,
  p_artist TEXT DEFAULT NULL,
  p_duration INTEGER DEFAULT 15,
  p_source_type TEXT DEFAULT 'unknown',
  p_video_id TEXT DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_music_id UUID;
  v_result JSON;
  v_existing RECORD;
BEGIN
  -- Check if music already exists by URL
  SELECT * INTO v_existing
  FROM public.music_library
  WHERE lower(url) = lower(p_url)
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    -- Music exists, increment usage count
    UPDATE public.music_library
    SET 
      usage_count = usage_count + 1,
      updated_at = now()
    WHERE id = v_existing.id;
    
    v_music_id := v_existing.id;
    
    RAISE NOTICE 'Incremented usage for existing music: %', v_music_id;
  ELSE
    -- Insert new music
    INSERT INTO public.music_library (
      url,
      title,
      artist,
      duration,
      source_type,
      video_id,
      thumbnail_url,
      usage_count
    ) VALUES (
      p_url,
      p_title,
      p_artist,
      p_duration,
      p_source_type,
      p_video_id,
      p_thumbnail_url,
      1
    )
    RETURNING id INTO v_music_id;
    
    RAISE NOTICE 'Inserted new music: %', v_music_id;
  END IF;

  -- Record usage if user_id provided
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.music_usage (music_id, user_id)
    VALUES (v_music_id, p_user_id);
    
    RAISE NOTICE 'Recorded usage for user: %', p_user_id;
  END IF;

  -- Update trending status
  PERFORM update_music_trending_status();

  -- Return the music entry as JSON (single object, not array)
  SELECT json_build_object(
    'success', true,
    'data', json_build_object(
      'id', m.id,
      'url', m.url,
      'title', m.title,
      'artist', m.artist,
      'duration', m.duration,
      'source_type', m.source_type,
      'video_id', m.video_id,
      'thumbnail_url', m.thumbnail_url,
      'usage_count', m.usage_count,
      'is_trending', m.is_trending,
      'created_at', m.created_at,
      'updated_at', m.updated_at
    )
  ) INTO v_result
  FROM public.music_library m
  WHERE m.id = v_music_id;

  RETURN v_result;
END;
$$;

-- Create function to get trending music (top N by usage in last 7 days)
CREATE OR REPLACE FUNCTION public.get_trending_music(p_limit INTEGER DEFAULT 10)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'success', true,
    'data', COALESCE(json_agg(t), '[]'::json)
  ) INTO v_result
  FROM (
    SELECT 
      m.id,
      m.url,
      m.title,
      m.artist,
      m.duration,
      m.source_type,
      m.video_id,
      m.thumbnail_url,
      m.usage_count,
      m.is_trending,
      m.created_at,
      COUNT(mu.id) as weekly_usage
    FROM public.music_library m
    LEFT JOIN public.music_usage mu ON mu.music_id = m.id 
      AND mu.used_at > now() - interval '7 days'
    GROUP BY m.id
    ORDER BY COUNT(mu.id) DESC, m.usage_count DESC
    LIMIT p_limit
  ) t;

  RETURN v_result;
END;
$$;

-- Create function to get music library with usage stats
CREATE OR REPLACE FUNCTION public.get_music_library_with_stats(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_total INTEGER;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO v_total FROM public.music_library;

  -- Get paginated results with weekly usage stats
  SELECT json_build_object(
    'success', true,
    'total', v_total,
    'data', COALESCE(json_agg(t ORDER BY t.usage_count DESC), '[]'::json)
  ) INTO v_result
  FROM (
    SELECT 
      m.id,
      m.url,
      m.title,
      m.artist,
      m.duration,
      m.source_type,
      m.video_id,
      m.thumbnail_url,
      m.usage_count,
      m.is_trending,
      m.start_at,
      m.created_at,
      m.updated_at,
      COALESCE((
        SELECT COUNT(*) 
        FROM public.music_usage mu 
        WHERE mu.music_id = m.id 
          AND mu.used_at > now() - interval '7 days'
      ), 0) as weekly_usage
    FROM public.music_library m
    ORDER BY m.usage_count DESC
    LIMIT p_limit
    OFFSET p_offset
  ) t;

  RETURN v_result;
END;
$$;