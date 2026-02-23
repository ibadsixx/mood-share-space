-- Add new columns to profiles table for enhanced contact and basic info
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_country_code text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS websites_social_links jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS pronouns text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS birth_year integer,
ADD COLUMN IF NOT EXISTS phone_visibility text DEFAULT 'public',
ADD COLUMN IF NOT EXISTS websites_visibility text DEFAULT 'public',
ADD COLUMN IF NOT EXISTS gender_visibility text DEFAULT 'public',
ADD COLUMN IF NOT EXISTS pronouns_visibility text DEFAULT 'public',
ADD COLUMN IF NOT EXISTS birth_date_visibility text DEFAULT 'public',
ADD COLUMN IF NOT EXISTS birth_year_visibility text DEFAULT 'public';

-- Add check constraints for visibility fields
ALTER TABLE profiles 
ADD CONSTRAINT check_phone_visibility 
CHECK (phone_visibility IN ('public', 'friends', 'only_me', 'custom'));

ALTER TABLE profiles 
ADD CONSTRAINT check_websites_visibility 
CHECK (websites_visibility IN ('public', 'friends', 'only_me', 'custom'));

ALTER TABLE profiles 
ADD CONSTRAINT check_gender_visibility 
CHECK (gender_visibility IN ('public', 'friends', 'only_me', 'custom'));

ALTER TABLE profiles 
ADD CONSTRAINT check_pronouns_visibility 
CHECK (pronouns_visibility IN ('public', 'friends', 'only_me', 'custom'));

ALTER TABLE profiles 
ADD CONSTRAINT check_birth_date_visibility 
CHECK (birth_date_visibility IN ('public', 'friends', 'only_me', 'custom'));

ALTER TABLE profiles 
ADD CONSTRAINT check_birth_year_visibility 
CHECK (birth_year_visibility IN ('public', 'friends', 'only_me', 'custom'));

-- Add check constraint for gender options
ALTER TABLE profiles 
ADD CONSTRAINT check_gender_options 
CHECK (gender IS NULL OR gender IN ('Male', 'Female', 'Custom'));

-- Add check constraint for pronouns options
ALTER TABLE profiles 
ADD CONSTRAINT check_pronouns_options 
CHECK (pronouns IS NULL OR pronouns IN ('He/Him', 'She/Her', 'They/Them', 'Custom'));