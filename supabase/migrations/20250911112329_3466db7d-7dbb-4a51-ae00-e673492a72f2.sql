-- Fix profile visibility constraints
-- Drop old constraints if they exist
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_phone_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_websites_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_gender_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_pronouns_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_birth_date_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_birth_year_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_email_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_college_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_company_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_function_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_high_school_visibility;

-- Update existing invalid/null values to "private" as safe fallback
UPDATE profiles SET phone_visibility = 'private'
WHERE COALESCE(phone_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles SET websites_visibility = 'private'
WHERE COALESCE(websites_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles SET gender_visibility = 'private'
WHERE COALESCE(gender_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles SET pronouns_visibility = 'private'
WHERE COALESCE(pronouns_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles SET birth_date_visibility = 'private'
WHERE COALESCE(birth_date_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles SET birth_year_visibility = 'private'
WHERE COALESCE(birth_year_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles SET email_visibility = 'private'
WHERE COALESCE(email_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles SET college_visibility = 'private'
WHERE COALESCE(college_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles SET company_visibility = 'private'
WHERE COALESCE(company_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles SET function_visibility = 'private'
WHERE COALESCE(function_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles SET high_school_visibility = 'private'
WHERE COALESCE(high_school_visibility,'') NOT IN ('public','friends','private');

-- Add new constraints enforcing the allowed values
ALTER TABLE profiles ADD CONSTRAINT check_phone_visibility 
CHECK (phone_visibility IN ('public','friends','private'));

ALTER TABLE profiles ADD CONSTRAINT check_websites_visibility 
CHECK (websites_visibility IN ('public','friends','private'));

ALTER TABLE profiles ADD CONSTRAINT check_gender_visibility 
CHECK (gender_visibility IN ('public','friends','private'));

ALTER TABLE profiles ADD CONSTRAINT check_pronouns_visibility 
CHECK (pronouns_visibility IN ('public','friends','private'));

ALTER TABLE profiles ADD CONSTRAINT check_birth_date_visibility 
CHECK (birth_date_visibility IN ('public','friends','private'));

ALTER TABLE profiles ADD CONSTRAINT check_birth_year_visibility 
CHECK (birth_year_visibility IN ('public','friends','private'));

ALTER TABLE profiles ADD CONSTRAINT check_email_visibility 
CHECK (email_visibility IN ('public','friends','private'));

ALTER TABLE profiles ADD CONSTRAINT check_college_visibility 
CHECK (college_visibility IN ('public','friends','private'));

ALTER TABLE profiles ADD CONSTRAINT check_company_visibility 
CHECK (company_visibility IN ('public','friends','private'));

ALTER TABLE profiles ADD CONSTRAINT check_function_visibility 
CHECK (function_visibility IN ('public','friends','private'));

ALTER TABLE profiles ADD CONSTRAINT check_high_school_visibility 
CHECK (high_school_visibility IN ('public','friends','private'));