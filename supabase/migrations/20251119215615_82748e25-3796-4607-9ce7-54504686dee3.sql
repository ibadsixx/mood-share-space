-- REMOVE ILLEGAL/UNNEEDED COLUMNS
ALTER TABLE music_library
DROP COLUMN IF EXISTS end_at,
DROP COLUMN IF EXISTS effects,
DROP COLUMN IF EXISTS weekly_usage,
DROP COLUMN IF EXISTS last_used_at;

-- REMOVE UNUSED FUNCTIONS
DROP FUNCTION IF EXISTS reset_weekly_music_usage();
DROP FUNCTION IF EXISTS increment_music_usage(UUID);

-- KEEP only start_at (already exists), duration optional
ALTER TABLE music_library
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 15;

-- Make sure source_type exists
ALTER TABLE music_library
ALTER COLUMN source_type SET NOT NULL;