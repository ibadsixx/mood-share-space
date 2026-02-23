-- Add scheduling fields to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'published' CHECK (status IN ('published', 'scheduled', 'draft'));

-- Update existing posts to have published status
UPDATE posts SET status = 'published' WHERE status IS NULL;

-- Create index for efficient scheduled post queries
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(status, scheduled_at) WHERE status = 'scheduled';

-- Update RLS policy to handle scheduled posts visibility
DROP POLICY IF EXISTS "Posts are viewable based on audience" ON posts;

CREATE POLICY "Posts are viewable based on audience and status" 
ON posts 
FOR SELECT 
USING (
  CASE 
    -- Scheduled posts are only visible to their author
    WHEN status = 'scheduled' THEN user_id = auth.uid()
    -- Published posts follow normal audience rules
    WHEN status = 'published' THEN can_view_post(auth.uid(), user_id, COALESCE(audience_type, 'public'::text), audience_user_ids, audience_excluded_user_ids, audience_list_id)
    -- Draft posts are only visible to their author
    WHEN status = 'draft' THEN user_id = auth.uid()
    ELSE false
  END
);