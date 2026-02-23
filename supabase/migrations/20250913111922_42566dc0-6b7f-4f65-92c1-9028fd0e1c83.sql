-- First, let's check what's causing the issue by dropping and recreating the function
DROP FUNCTION IF EXISTS public.can_view_profile_field(uuid, uuid, text);

-- Create visibility enum type
DO $$ BEGIN
    CREATE TYPE visibility_enum AS ENUM ('public', 'friends', 'only_me', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Now update the column type
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility TYPE visibility_enum USING 
  CASE 
    WHEN friends_visibility = 'public' THEN 'public'::visibility_enum
    WHEN friends_visibility = 'friends' THEN 'friends'::visibility_enum
    WHEN friends_visibility = 'only_me' THEN 'only_me'::visibility_enum
    WHEN friends_visibility = 'custom' THEN 'custom'::visibility_enum
    ELSE 'public'::visibility_enum
  END;

-- Set the proper default
ALTER TABLE public.profiles 
ALTER COLUMN friends_visibility SET DEFAULT 'public'::visibility_enum;

-- Update following_visibility defaults
ALTER TABLE public.profiles 
ALTER COLUMN following_visibility SET DEFAULT true;

-- Update NULL values
UPDATE public.profiles 
SET friends_visibility = 'public'::visibility_enum 
WHERE friends_visibility IS NULL;

UPDATE public.profiles 
SET following_visibility = true 
WHERE following_visibility IS NULL;

-- Recreate the function with proper enum support
CREATE OR REPLACE FUNCTION public.can_view_profile_field(viewer_id uuid, profile_user_id uuid, field_visibility text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    -- Profile owner can always see their own information
    WHEN viewer_id = profile_user_id THEN true
    -- Public fields are visible to everyone
    WHEN field_visibility = 'public' THEN true
    -- Private fields are only visible to the owner
    WHEN field_visibility = 'private' OR field_visibility = 'only_me' THEN false
    -- Friends fields are visible to friends
    WHEN field_visibility = 'friends' THEN public.is_friend(viewer_id, profile_user_id)
    -- Default deny
    ELSE false
  END;
$function$;