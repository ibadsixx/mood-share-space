
-- Drop the incorrect foreign key pointing to auth.users
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_user_id_fkey;

-- Add correct foreign key pointing to profiles
ALTER TABLE stories
ADD CONSTRAINT stories_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
