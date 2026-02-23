-- Add columns for music trimming, effects, and weekly analytics
ALTER TABLE music_library
ADD COLUMN IF NOT EXISTS start_at INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS end_at INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS effects JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS weekly_usage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for weekly analytics
CREATE INDEX IF NOT EXISTS idx_music_library_weekly_usage ON music_library(weekly_usage DESC);
CREATE INDEX IF NOT EXISTS idx_music_library_last_used ON music_library(last_used_at DESC);

-- Function to reset weekly usage counts (should be run weekly via cron)
CREATE OR REPLACE FUNCTION reset_weekly_music_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE music_library
  SET weekly_usage = 0
  WHERE last_used_at < now() - interval '7 days';
END;
$$;

-- Function to increment both usage_count and weekly_usage
CREATE OR REPLACE FUNCTION increment_music_usage(music_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE music_library
  SET 
    usage_count = usage_count + 1,
    weekly_usage = weekly_usage + 1,
    last_used_at = now()
  WHERE id = music_id;
END;
$$;

COMMENT ON COLUMN music_library.start_at IS 'Start time in seconds for trimmed music';
COMMENT ON COLUMN music_library.end_at IS 'End time in seconds for trimmed music (NULL = full duration)';
COMMENT ON COLUMN music_library.effects IS 'JSON object containing audio effects: {reverb, echo, bassBoost, fadeIn, fadeOut, pitch}';
COMMENT ON COLUMN music_library.weekly_usage IS 'Number of times used in the past 7 days';
COMMENT ON COLUMN music_library.last_used_at IS 'Last time this music was used';