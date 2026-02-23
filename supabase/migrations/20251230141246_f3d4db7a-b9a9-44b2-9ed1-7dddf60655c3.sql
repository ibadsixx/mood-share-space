-- =============================================
-- Enhanced Report, Block, Hide System
-- =============================================

-- 1. Create report_status enum if not exists
DO $$ BEGIN
  CREATE TYPE public.content_report_status AS ENUM ('pending', 'reviewed', 'action_taken', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create content_type enum for posts
DO $$ BEGIN
  CREATE TYPE public.content_type AS ENUM ('reel', 'video', 'normal_post', 'story');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create hidden_content table for hide system
CREATE TABLE IF NOT EXISTS public.hidden_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID, -- NULL if hiding entire profile
  content_type TEXT, -- 'reel', 'video', 'post', 'story'
  hidden_profile_id UUID, -- For hiding all content from a profile
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure at least one of content_id or hidden_profile_id is set
  CONSTRAINT hidden_content_target_check CHECK (
    (content_id IS NOT NULL AND hidden_profile_id IS NULL) OR
    (content_id IS NULL AND hidden_profile_id IS NOT NULL)
  ),
  
  -- Prevent duplicate hide entries
  CONSTRAINT unique_hidden_content UNIQUE (user_id, content_id) DEFERRABLE,
  CONSTRAINT unique_hidden_profile UNIQUE (user_id, hidden_profile_id) DEFERRABLE
);

-- 4. Add missing columns to reel_reports for multi-step reporting
DO $$ BEGIN
  ALTER TABLE public.reel_reports ADD COLUMN IF NOT EXISTS reel_owner_id UUID;
  ALTER TABLE public.reel_reports ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'reel';
  ALTER TABLE public.reel_reports ADD COLUMN IF NOT EXISTS main_reason TEXT;
  ALTER TABLE public.reel_reports ADD COLUMN IF NOT EXISTS sub_reason TEXT;
  ALTER TABLE public.reel_reports ADD COLUMN IF NOT EXISTS detailed_reason TEXT;
  ALTER TABLE public.reel_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 5. Add missing columns to reported_posts for enhanced reporting
DO $$ BEGIN
  ALTER TABLE public.reported_posts ADD COLUMN IF NOT EXISTS post_owner_id UUID;
  ALTER TABLE public.reported_posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'normal_post';
  ALTER TABLE public.reported_posts ADD COLUMN IF NOT EXISTS main_reason TEXT;
  ALTER TABLE public.reported_posts ADD COLUMN IF NOT EXISTS sub_reason TEXT;
  ALTER TABLE public.reported_posts ADD COLUMN IF NOT EXISTS detailed_reason TEXT;
  ALTER TABLE public.reported_posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 6. Enable RLS on hidden_content
ALTER TABLE public.hidden_content ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for hidden_content
CREATE POLICY "Users can view their own hidden content"
ON public.hidden_content FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can hide content"
ON public.hidden_content FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unhide content"
ON public.hidden_content FOR DELETE
USING (auth.uid() = user_id);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hidden_content_user_id ON public.hidden_content(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_content_content_id ON public.hidden_content(content_id) WHERE content_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hidden_content_hidden_profile_id ON public.hidden_content(hidden_profile_id) WHERE hidden_profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reel_reports_status ON public.reel_reports(status);
CREATE INDEX IF NOT EXISTS idx_reported_posts_status ON public.reported_posts(status);

-- 9. Create helper function to check if content is hidden for a user
CREATE OR REPLACE FUNCTION public.is_content_hidden(
  p_user_id UUID,
  p_content_id UUID,
  p_content_owner_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM hidden_content
    WHERE user_id = p_user_id
    AND (
      content_id = p_content_id
      OR (p_content_owner_id IS NOT NULL AND hidden_profile_id = p_content_owner_id)
    )
  );
$$;

-- 10. Create helper function to check if user should see content (combines block + hide checks)
CREATE OR REPLACE FUNCTION public.can_see_content(
  p_viewer_id UUID,
  p_content_id UUID,
  p_content_owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    -- Check if blocked
    SELECT 1 FROM blocks 
    WHERE (blocker_id = p_viewer_id AND blocked_id = p_content_owner_id)
       OR (blocker_id = p_content_owner_id AND blocked_id = p_viewer_id)
  )
  AND NOT EXISTS (
    -- Check if content or profile is hidden
    SELECT 1 FROM hidden_content
    WHERE user_id = p_viewer_id
    AND (content_id = p_content_id OR hidden_profile_id = p_content_owner_id)
  );
$$;

-- 11. Create function to get blocked user IDs for a user
CREATE OR REPLACE FUNCTION public.get_blocked_user_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY_AGG(DISTINCT 
      CASE 
        WHEN blocker_id = p_user_id THEN blocked_id
        ELSE blocker_id
      END
    ),
    '{}'::UUID[]
  )
  FROM blocks
  WHERE blocker_id = p_user_id OR blocked_id = p_user_id;
$$;

-- 12. Create function to get hidden content IDs for a user
CREATE OR REPLACE FUNCTION public.get_hidden_content_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(content_id), '{}'::UUID[])
  FROM hidden_content
  WHERE user_id = p_user_id AND content_id IS NOT NULL;
$$;

-- 13. Create function to get hidden profile IDs for a user
CREATE OR REPLACE FUNCTION public.get_hidden_profile_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(hidden_profile_id), '{}'::UUID[])
  FROM hidden_content
  WHERE user_id = p_user_id AND hidden_profile_id IS NOT NULL;
$$;