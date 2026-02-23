-- Voice Message Support Migration
-- Add audio-related columns to messages table and create storage bucket

-- Add audio columns to messages table
ALTER TABLE messages
  ADD COLUMN audio_path TEXT,
  ADD COLUMN audio_url TEXT,
  ADD COLUMN audio_duration INT,
  ADD COLUMN audio_mime TEXT,
  ADD COLUMN audio_size INT;

-- Create index for audio messages
CREATE INDEX IF NOT EXISTS idx_messages_audio ON messages(audio_path);

-- Create message_audios storage bucket (private for security)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message_audios',
  'message_audios', 
  false,
  5242880, -- 5MB limit
  ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav']
);

-- RLS policies for message_audios bucket
CREATE POLICY "Authenticated users can upload audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'message_audios' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can access audio files from their conversations" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'message_audios' 
  AND (
    -- User uploaded the file
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- User is participant in conversation that contains this audio
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.audio_path = name 
        AND cp.user_id = auth.uid()
    )
  )
);

-- RPC function to create message with audio (atomic operation with validation)
CREATE OR REPLACE FUNCTION create_message_with_audio(
  p_conversation_id uuid,
  p_sender_id uuid,
  p_audio_path text,
  p_audio_duration int,
  p_audio_mime text,
  p_audio_size int,
  p_content text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id uuid;
BEGIN
  -- Validate sender is authenticated user
  IF p_sender_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot send message as another user';
  END IF;
  
  -- Validate user is participant in conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id 
      AND cp.user_id = p_sender_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You are not a participant in this conversation';
  END IF;
  
  -- Check if users are blocked
  IF EXISTS (
    SELECT 1 FROM conversation_participants cp
    JOIN blocks b ON (
      (b.blocker_id = p_sender_id AND b.blocked_id = cp.user_id)
      OR (b.blocker_id = cp.user_id AND b.blocked_id = p_sender_id)
    )
    WHERE cp.conversation_id = p_conversation_id 
      AND cp.user_id != p_sender_id
  ) THEN
    RAISE EXCEPTION 'Cannot send message: User is blocked';
  END IF;
  
  -- Validate audio parameters
  IF p_audio_duration > 60 THEN
    RAISE EXCEPTION 'Audio duration cannot exceed 60 seconds';
  END IF;
  
  IF p_audio_size > 5242880 THEN -- 5MB
    RAISE EXCEPTION 'Audio file size cannot exceed 5MB';
  END IF;
  
  -- Insert message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    audio_path,
    audio_duration,
    audio_mime,
    audio_size
  ) VALUES (
    p_conversation_id,
    p_sender_id,
    p_content,
    p_audio_path,
    p_audio_duration,
    p_audio_mime,
    p_audio_size
  ) RETURNING id INTO v_message_id;
  
  -- Update conversation timestamp
  UPDATE conversations 
  SET updated_at = now() 
  WHERE id = p_conversation_id;
  
  RETURN v_message_id;
END;
$$;