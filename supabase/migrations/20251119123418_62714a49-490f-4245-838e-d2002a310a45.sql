-- Add privacy column to stories table
ALTER TABLE stories ADD COLUMN privacy text NOT NULL DEFAULT 'public';

-- Add check constraint for valid privacy values
ALTER TABLE stories ADD CONSTRAINT stories_privacy_check 
  CHECK (privacy IN ('public', 'friends', 'close_friends', 'private'));

-- Update RLS policies for stories to respect privacy settings
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;

-- New policy: Stories visible based on privacy setting
CREATE POLICY "Stories visible based on privacy" ON stories
  FOR SELECT
  USING (
    CASE privacy
      -- Public stories visible to everyone
      WHEN 'public' THEN true
      -- Private stories only visible to owner
      WHEN 'private' THEN user_id = auth.uid()
      -- Friends only stories visible to owner and friends
      WHEN 'friends' THEN (
        user_id = auth.uid() OR
        is_friend(auth.uid(), user_id)
      )
      -- Close friends stories visible to owner and close friends (using friends for now)
      WHEN 'close_friends' THEN (
        user_id = auth.uid() OR
        is_friend(auth.uid(), user_id)
      )
      ELSE false
    END
  );

-- Allow users to create their own stories with any privacy setting
DROP POLICY IF EXISTS "Users can create their own stories" ON stories;
CREATE POLICY "Users can create their own stories" ON stories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own stories
DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;
CREATE POLICY "Users can delete their own stories" ON stories
  FOR DELETE
  USING (auth.uid() = user_id);