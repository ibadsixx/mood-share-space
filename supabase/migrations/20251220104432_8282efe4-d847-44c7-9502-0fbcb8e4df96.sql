-- Add missing columns to posts table for Review & Publish persistence

-- Alt text for accessibility (optional)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS alt_text text;

-- AI label indicator
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS ai_label boolean DEFAULT false;

-- Comments enabled toggle
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comments_enabled boolean DEFAULT true;

-- Hide like count toggle
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS hide_like_count boolean DEFAULT false;

-- Hide share count toggle
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS hide_share_count boolean DEFAULT false;

-- Post to story toggle
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_to_story boolean DEFAULT false;

-- Boost indicator
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS boost boolean DEFAULT false;

-- Reminder timestamp
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS reminder_at timestamp with time zone;

-- Tagged people (as JSONB array)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS tagged_people jsonb DEFAULT '[]'::jsonb;

-- Product details (as JSONB object)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS product_details jsonb;