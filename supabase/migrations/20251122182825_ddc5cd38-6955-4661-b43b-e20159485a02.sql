-- Add reel-specific fields to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('video', 'image')),
ADD COLUMN IF NOT EXISTS music_url TEXT,
ADD COLUMN IF NOT EXISTS music_source TEXT,
ADD COLUMN IF NOT EXISTS music_start INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS thumbnail TEXT;

-- Create index for reel queries
CREATE INDEX IF NOT EXISTS idx_posts_media_type ON posts(media_type) WHERE media_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_duration ON posts(duration) WHERE duration IS NOT NULL;