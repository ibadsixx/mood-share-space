-- 0) BACKUP (important)
CREATE TABLE IF NOT EXISTS profiles_backup AS TABLE profiles;

-- 1) Identify and fix rows with invalid visibility values
UPDATE profiles
SET phone_visibility = 'private'
WHERE COALESCE(phone_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles
SET websites_visibility = 'private'
WHERE COALESCE(websites_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles
SET gender_visibility = 'private'
WHERE COALESCE(gender_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles
SET pronouns_visibility = 'private'
WHERE COALESCE(pronouns_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles
SET birth_date_visibility = 'private'
WHERE COALESCE(birth_date_visibility,'') NOT IN ('public','friends','private');

UPDATE profiles
SET birth_year_visibility = 'private'
WHERE COALESCE(birth_year_visibility,'') NOT IN ('public','friends','private');

-- 2) Drop old check constraints (if they exist)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_phone_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_websites_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_gender_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_pronouns_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_birth_date_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_birth_year_visibility;

-- 3) Create enum type visibility_enum (only create if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility_enum') THEN
    CREATE TYPE visibility_enum AS ENUM ('public','friends','private');
  END IF;
END
$$;