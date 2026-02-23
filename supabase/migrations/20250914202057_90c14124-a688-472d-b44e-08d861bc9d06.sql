-- Add image support columns to messages table
ALTER TABLE public.messages 
ADD COLUMN image_url TEXT,
ADD COLUMN is_image BOOLEAN DEFAULT false;

-- Create index for better query performance on image messages
CREATE INDEX idx_messages_is_image ON public.messages(is_image) WHERE is_image = true;