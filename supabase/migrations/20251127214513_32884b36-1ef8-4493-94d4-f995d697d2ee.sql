-- Add missing music metadata fields to posts table for reels
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS music_video_id TEXT,
ADD COLUMN IF NOT EXISTS music_title TEXT,
ADD COLUMN IF NOT EXISTS music_artist TEXT,
ADD COLUMN IF NOT EXISTS music_thumbnail_url TEXT;

-- Add music_duration if not using the duration field
-- Note: duration field already exists and is used for video duration
-- music_start already exists, we'll calculate end as start + duration

-- Create index for music queries
CREATE INDEX IF NOT EXISTS idx_posts_music_url ON posts(music_url) WHERE music_url IS NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN posts.music_url IS 'URL to external music source (YouTube, SoundCloud, etc.)';
COMMENT ON COLUMN posts.music_source IS 'Source type: youtube, soundcloud, spotify, direct_audio';
COMMENT ON COLUMN posts.music_start IS 'Start time in seconds for music playback';
COMMENT ON COLUMN posts.music_video_id IS 'Video ID for YouTube/Spotify tracks';
COMMENT ON COLUMN posts.music_title IS 'Title of the music track';
COMMENT ON COLUMN posts.music_artist IS 'Artist name';
COMMENT ON COLUMN posts.music_thumbnail_url IS 'Thumbnail URL for the track';