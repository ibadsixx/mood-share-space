-- Create visibility enum type
DO $$ BEGIN
    CREATE TYPE visibility_enum AS ENUM ('public', 'friends', 'only_me', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the profiles table to use the proper visibility enum for friends_visibility
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility TYPE visibility_enum USING friends_visibility::visibility_enum;

-- Set default value for friends_visibility
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility SET DEFAULT 'public'::visibility_enum;

-- Ensure following_visibility has proper default
ALTER TABLE public.profiles 
ALTER COLUMN following_visibility SET DEFAULT true;