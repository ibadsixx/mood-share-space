-- Create visibility enum type
DO $$ BEGIN
    CREATE TYPE visibility_enum AS ENUM ('public', 'friends', 'only_me', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- First, remove the default from friends_visibility
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility DROP DEFAULT;

-- Update the profiles table to use the proper visibility enum for friends_visibility
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility TYPE visibility_enum USING friends_visibility::visibility_enum;

-- Set the proper default value for friends_visibility
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility SET DEFAULT 'public'::visibility_enum;

-- Ensure following_visibility has proper default and not null constraint
ALTER TABLE public.profiles 
ALTER COLUMN following_visibility SET DEFAULT true,
ALTER COLUMN following_visibility SET NOT NULL;