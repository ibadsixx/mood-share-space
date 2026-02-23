-- Add music segment columns to stories table
ALTER TABLE stories 
  ADD COLUMN IF NOT EXISTS music_start_at INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS music_duration INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS music_source_type TEXT,
  ADD COLUMN IF NOT EXISTS music_video_id TEXT,
  ADD COLUMN IF NOT EXISTS music_thumbnail_url TEXT;

-- Ensure music_library columns are correct
ALTER TABLE music_library 
  ALTER COLUMN source_type SET NOT NULL,
  ALTER COLUMN duration SET DEFAULT 15;

COMMENT ON COLUMN stories.music_start_at IS 'Start time in seconds for music playback';
COMMENT ON COLUMN stories.music_duration IS 'Duration in seconds for music playback (max 15)';
COMMENT ON COLUMN stories.music_source_type IS 'Source type: youtube, soundcloud, spotify, direct_audio';
COMMENT ON COLUMN stories.music_video_id IS 'Video ID for YouTube videos';
COMMENT ON COLUMN stories.music_thumbnail_url IS 'Thumbnail URL for music track';