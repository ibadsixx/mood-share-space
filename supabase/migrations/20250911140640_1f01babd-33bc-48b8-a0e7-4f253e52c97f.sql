-- 4) Convert columns to use the enum type
ALTER TABLE profiles ALTER COLUMN phone_visibility TYPE visibility_enum USING phone_visibility::visibility_enum;
ALTER TABLE profiles ALTER COLUMN websites_visibility TYPE visibility_enum USING websites_visibility::visibility_enum;
ALTER TABLE profiles ALTER COLUMN gender_visibility TYPE visibility_enum USING gender_visibility::visibility_enum;
ALTER TABLE profiles ALTER COLUMN pronouns_visibility TYPE visibility_enum USING pronouns_visibility::visibility_enum;
ALTER TABLE profiles ALTER COLUMN birth_date_visibility TYPE visibility_enum USING birth_date_visibility::visibility_enum;
ALTER TABLE profiles ALTER COLUMN birth_year_visibility TYPE visibility_enum USING birth_year_visibility::visibility_enum;

-- 5) Set defaults after type conversion
ALTER TABLE profiles ALTER COLUMN phone_visibility SET DEFAULT 'private';
ALTER TABLE profiles ALTER COLUMN websites_visibility SET DEFAULT 'private';
ALTER TABLE profiles ALTER COLUMN gender_visibility SET DEFAULT 'private';
ALTER TABLE profiles ALTER COLUMN pronouns_visibility SET DEFAULT 'private';
ALTER TABLE profiles ALTER COLUMN birth_date_visibility SET DEFAULT 'private';
ALTER TABLE profiles ALTER COLUMN birth_year_visibility SET DEFAULT 'private';