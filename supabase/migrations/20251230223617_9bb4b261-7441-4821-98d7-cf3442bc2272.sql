-- Add post_url column to reported_posts
ALTER TABLE public.reported_posts
  ADD COLUMN IF NOT EXISTS post_url TEXT NULL;

-- Make post_owner_id NOT NULL for new reports (existing null values preserved)
-- Add unique constraint to prevent duplicate reports by same user on same post
CREATE UNIQUE INDEX IF NOT EXISTS idx_reported_posts_unique_user_post 
  ON public.reported_posts (reported_by, post_id);

-- Add check constraint to prevent self-reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'reported_posts' AND constraint_name = 'no_self_report'
  ) THEN
    ALTER TABLE public.reported_posts 
      ADD CONSTRAINT no_self_report CHECK (reported_by != post_owner_id);
  END IF;
END $$;