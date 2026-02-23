-- Add privacy settings for friends and following lists to profiles table
ALTER TABLE public.profiles 
ADD COLUMN friends_visibility text DEFAULT 'public' CHECK (friends_visibility IN ('public', 'friends', 'private')),
ADD COLUMN following_visibility boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.friends_visibility IS 'Controls who can see the user''s friends list: public, friends, or private';
COMMENT ON COLUMN public.profiles.following_visibility IS 'Controls whether the user''s following list is visible to others';