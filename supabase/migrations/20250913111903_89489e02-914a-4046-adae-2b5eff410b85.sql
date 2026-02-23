-- Create visibility enum type
DO $$ BEGIN
    CREATE TYPE visibility_enum AS ENUM ('public', 'friends', 'only_me', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- First, temporarily disable RLS on profiles to avoid policy conflicts
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Remove the default from friends_visibility
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility DROP DEFAULT;

-- Update the profiles table to use the proper visibility enum for friends_visibility
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility TYPE visibility_enum USING friends_visibility::visibility_enum;

-- Set the proper default value for friends_visibility
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility SET DEFAULT 'public'::visibility_enum;

-- Ensure following_visibility has proper default
ALTER TABLE public.profiles 
ALTER COLUMN following_visibility SET DEFAULT true;

-- Update all NULL values to proper defaults
UPDATE public.profiles 
SET friends_visibility = 'public'::visibility_enum 
WHERE friends_visibility IS NULL;

UPDATE public.profiles 
SET following_visibility = true 
WHERE following_visibility IS NULL;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;