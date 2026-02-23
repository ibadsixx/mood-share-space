-- 0) BACKUP (important)
CREATE TABLE IF NOT EXISTS profiles_backup AS TABLE profiles;

-- 1) Identify rows with invalid visibility values
SELECT id,
       phone_visibility,
       websites_visibility,
       gender_visibility,
       pronouns_visibility,
       birth_date_visibility,
       birth_year_visibility
FROM profiles
WHERE COALESCE(phone_visibility,'')   NOT IN ('public','friends','private')
   OR COALESCE(websites_visibility,'') NOT IN ('public','friends','private')
   OR COALESCE(gender_visibility,'')   NOT IN ('public','friends','private')
   OR COALESCE(pronouns_visibility,'') NOT IN ('public','friends','private')
   OR COALESCE(birth_date_visibility,'') NOT IN ('public','friends','private')
   OR COALESCE(birth_year_visibility,'') NOT IN ('public','friends','private');

-- 2) Normalize invalid values to a safe fallback (private).
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

-- 3) Drop old check constraints (if they exist)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_phone_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_websites_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_gender_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_pronouns_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_birth_date_visibility;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_birth_year_visibility;

-- 4) Create enum type visibility_enum (only create if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility_enum') THEN
    CREATE TYPE visibility_enum AS ENUM ('public','friends','private');
  END IF;
END
$$;

-- 5) Alter columns to use the enum type and set a safe DEFAULT ('private').
ALTER TABLE profiles
  ALTER COLUMN phone_visibility TYPE visibility_enum USING phone_visibility::visibility_enum,
  ALTER COLUMN phone_visibility SET DEFAULT 'private';

ALTER TABLE profiles
  ALTER COLUMN websites_visibility TYPE visibility_enum USING websites_visibility::visibility_enum,
  ALTER COLUMN websites_visibility SET DEFAULT 'private';

ALTER TABLE profiles
  ALTER COLUMN gender_visibility TYPE visibility_enum USING gender_visibility::visibility_enum,
  ALTER COLUMN gender_visibility SET DEFAULT 'private';

ALTER TABLE profiles
  ALTER COLUMN pronouns_visibility TYPE visibility_enum USING pronouns_visibility::visibility_enum,
  ALTER COLUMN pronouns_visibility SET DEFAULT 'private';

ALTER TABLE profiles
  ALTER COLUMN birth_date_visibility TYPE visibility_enum USING birth_date_visibility::visibility_enum,
  ALTER COLUMN birth_date_visibility SET DEFAULT 'private';

ALTER TABLE profiles
  ALTER COLUMN birth_year_visibility TYPE visibility_enum USING birth_year_visibility::visibility_enum,
  ALTER COLUMN birth_year_visibility SET DEFAULT 'private';