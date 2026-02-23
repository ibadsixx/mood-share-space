-- Add GIF support to messages table
ALTER TABLE messages
ADD COLUMN gif_id TEXT,
ADD COLUMN gif_url TEXT,
ADD COLUMN is_gif BOOLEAN DEFAULT false;

-- Add index for better performance when querying GIF messages
CREATE INDEX idx_messages_is_gif ON messages(is_gif) WHERE is_gif = true;