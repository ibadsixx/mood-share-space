
-- Update RLS policy to handle unauthenticated users gracefully
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;

CREATE POLICY "Stories are viewable by everyone" ON stories
FOR SELECT USING (
  (expires_at > now()) 
  AND (
    auth.uid() IS NULL 
    OR NOT is_blocked(auth.uid(), user_id)
  )
);

-- Create indexes for better performance (without WHERE clause with now())
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
