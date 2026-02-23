-- Create message_type enum for better message categorization
CREATE TYPE message_type_enum AS ENUM (
  'text',
  'image', 
  'gif',
  'sticker',
  'audio',
  'video',
  'file'
);

-- Add message_type column to messages table
ALTER TABLE messages ADD COLUMN message_type message_type_enum DEFAULT 'text';

-- Update existing messages to have correct message types based on current data
UPDATE messages 
SET message_type = CASE 
  WHEN is_sticker = true THEN 'sticker'::message_type_enum
  WHEN is_gif = true THEN 'gif'::message_type_enum  
  WHEN audio_path IS NOT NULL THEN 'audio'::message_type_enum
  WHEN is_image = true THEN 'image'::message_type_enum
  ELSE 'text'::message_type_enum
END;

-- Create trigger function to automatically set message_type when inserting
CREATE OR REPLACE FUNCTION set_message_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine message type based on other fields
  IF NEW.is_sticker = true OR NEW.sticker_url IS NOT NULL THEN
    NEW.message_type = 'sticker';
  ELSIF NEW.is_gif = true OR NEW.gif_url IS NOT NULL THEN
    NEW.message_type = 'gif';
  ELSIF NEW.audio_path IS NOT NULL THEN
    NEW.message_type = 'audio';
  ELSIF NEW.is_image = true OR NEW.image_url IS NOT NULL THEN
    NEW.message_type = 'image';
  ELSIF NEW.media_url IS NOT NULL THEN
    -- Determine type from file extension if possible
    IF NEW.media_url ~* '\.(jpg|jpeg|png|gif|webp)$' THEN
      NEW.message_type = 'image';
    ELSIF NEW.media_url ~* '\.(mp4|webm|ogg|mov)$' THEN
      NEW.message_type = 'video';
    ELSE
      NEW.message_type = 'file';
    END IF;
  ELSE
    NEW.message_type = 'text';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set message_type on insert/update
DROP TRIGGER IF EXISTS messages_set_type_trigger ON messages;
CREATE TRIGGER messages_set_type_trigger
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_message_type();