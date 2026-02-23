-- Create the enum with the exact values that match the application
DO $$ BEGIN
    CREATE TYPE visibility_enum AS ENUM ('public', 'friends', 'only_me', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- First check what actual values exist in the database
-- Update the column type safely by mapping existing text values to enum values
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility TYPE visibility_enum USING 
  CASE 
    WHEN friends_visibility IN ('public', 'Public') THEN 'public'::visibility_enum
    WHEN friends_visibility IN ('friends', 'Friends') THEN 'friends'::visibility_enum  
    WHEN friends_visibility IN ('only_me', 'Only Me', 'private', 'Private') THEN 'only_me'::visibility_enum
    WHEN friends_visibility IN ('custom', 'Custom') THEN 'custom'::visibility_enum
    ELSE 'public'::visibility_enum
  END;

-- Set the proper default
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility SET DEFAULT 'public'::visibility_enum;

-- Update following_visibility to ensure it has proper defaults
ALTER TABLE public.profiles 
ALTER COLUMN following_visibility SET DEFAULT true;

-- Update any NULL values
UPDATE public.profiles 
SET friends_visibility = 'public'::visibility_enum 
WHERE friends_visibility IS NULL;

UPDATE public.profiles 
SET following_visibility = true 
WHERE following_visibility IS NULL;