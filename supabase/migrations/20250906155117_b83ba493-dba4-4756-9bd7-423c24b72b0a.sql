-- Add shared_post_id field to posts table for sharing functionality
ALTER TABLE public.posts 
ADD COLUMN shared_post_id uuid REFERENCES public.posts(id);