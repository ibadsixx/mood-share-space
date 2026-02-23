-- Add new post types for profile updates
ALTER TYPE post_type ADD VALUE IF NOT EXISTS 'profile_pic_change';
ALTER TYPE post_type ADD VALUE IF NOT EXISTS 'cover_pic_change';

-- Create post_media table for multiple attachments per post
CREATE TABLE IF NOT EXISTS public.post_media (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for post_media
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for post_media
CREATE POLICY "Post media is viewable by everyone" 
ON public.post_media 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create media for their own posts" 
ON public.post_media 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_media.post_id 
    AND posts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update media for their own posts" 
ON public.post_media 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_media.post_id 
    AND posts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete media for their own posts" 
ON public.post_media 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_media.post_id 
    AND posts.user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media(post_id);