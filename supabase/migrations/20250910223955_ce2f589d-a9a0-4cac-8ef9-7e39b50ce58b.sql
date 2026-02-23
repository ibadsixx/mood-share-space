-- Update profiles table to support the new Contact and Basic Info fields with privacy controls

-- Add new columns for contact and basic info
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_country_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS websites_social_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year INTEGER;

-- Add privacy control columns for each field
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_visibility TEXT DEFAULT 'public';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_visibility TEXT DEFAULT 'public';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS websites_visibility TEXT DEFAULT 'public';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender_visibility TEXT DEFAULT 'public';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns_visibility TEXT DEFAULT 'public';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date_visibility TEXT DEFAULT 'public';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year_visibility TEXT DEFAULT 'public';

-- Create a check constraint for privacy visibility options
ALTER TABLE profiles ADD CONSTRAINT check_privacy_values 
CHECK (
  email_visibility IN ('public', 'friends', 'private') AND
  phone_visibility IN ('public', 'friends', 'private') AND
  websites_visibility IN ('public', 'friends', 'private') AND
  gender_visibility IN ('public', 'friends', 'private') AND
  pronouns_visibility IN ('public', 'friends', 'private') AND
  birth_date_visibility IN ('public', 'friends', 'private') AND
  birth_year_visibility IN ('public', 'friends', 'private')
);

-- Create a function to check if a viewer can see private profile information
CREATE OR REPLACE FUNCTION public.can_view_profile_field(viewer_id uuid, profile_user_id uuid, field_visibility text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE
    -- Profile owner can always see their own information
    WHEN viewer_id = profile_user_id THEN true
    -- Public fields are visible to everyone
    WHEN field_visibility = 'public' THEN true
    -- Private fields are only visible to the owner
    WHEN field_visibility = 'private' THEN false
    -- Friends fields are visible to friends
    WHEN field_visibility = 'friends' THEN public.is_friend(viewer_id, profile_user_id)
    -- Default deny
    ELSE false
  END;
$$;