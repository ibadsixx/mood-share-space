-- Add missing fields to pages table for enhanced functionality
ALTER TABLE public.pages 
ADD COLUMN category TEXT,
ADD COLUMN cover_image TEXT;

-- Add role field to page_followers table
ALTER TABLE public.page_followers 
ADD COLUMN role TEXT DEFAULT 'follower';

-- Update page_followers table to use followed_at instead of created_at for clarity
ALTER TABLE public.page_followers 
RENAME COLUMN created_at TO followed_at;

-- Create an enum for page follower roles
CREATE TYPE public.page_follower_role AS ENUM ('follower', 'admin', 'editor');

-- Update the role column to use the enum
ALTER TABLE public.page_followers 
ALTER COLUMN role TYPE page_follower_role USING role::page_follower_role;

-- Create index for better query performance
CREATE INDEX idx_pages_category ON public.pages(category);
CREATE INDEX idx_pages_created_at ON public.pages(created_at DESC);
CREATE INDEX idx_page_followers_user_id ON public.page_followers(user_id);
CREATE INDEX idx_page_followers_page_id ON public.page_followers(page_id);