-- Drop the enum if it exists to recreate it properly
DROP TYPE IF EXISTS visibility_enum CASCADE;

-- Create the enum with exact application values
CREATE TYPE visibility_enum AS ENUM ('public', 'friends', 'only_me', 'custom');

-- Update the column type properly - we need to be more careful about the conversion
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility TYPE visibility_enum USING 
  CASE friends_visibility
    WHEN 'public' THEN 'public'::visibility_enum
    WHEN 'friends' THEN 'friends'::visibility_enum  
    WHEN 'private' THEN 'only_me'::visibility_enum
    WHEN 'custom' THEN 'custom'::visibility_enum
    ELSE 'public'::visibility_enum
  END;

-- Set the proper default
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility SET DEFAULT 'public'::visibility_enum;

-- Set NOT NULL constraint to ensure data integrity
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility SET NOT NULL;

-- Update following_visibility to ensure it has proper defaults  
ALTER TABLE public.profiles 
ALTER COLUMN following_visibility SET DEFAULT true;

ALTER TABLE public.profiles 
ALTER COLUMN following_visibility SET NOT NULL;

-- Update any remaining NULL values
UPDATE public.profiles 
SET friends_visibility = 'public'::visibility_enum 
WHERE friends_visibility IS NULL;

UPDATE public.profiles 
SET following_visibility = true 
WHERE following_visibility IS NULL;