-- Fix functions that still reference renamed column hidden_profile_id
-- The column was renamed to profile_id in 20260104175001

-- 1. Fix is_content_hidden
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
      OR (p_content_owner_id IS NOT NULL AND profile_id = p_content_owner_id)
    )
  );
$$;

-- 2. Fix can_see_content
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
    SELECT 1 FROM blocks 
    WHERE (blocker_id = p_viewer_id AND blocked_id = p_content_owner_id)
       OR (blocker_id = p_content_owner_id AND blocked_id = p_viewer_id)
  )
  AND NOT EXISTS (
    SELECT 1 FROM hidden_content
    WHERE user_id = p_viewer_id
    AND (content_id = p_content_id OR profile_id = p_content_owner_id)
  );
$$;

-- 3. Fix get_hidden_profile_ids
CREATE OR REPLACE FUNCTION public.get_hidden_profile_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(profile_id), '{}'::UUID[])
  FROM hidden_content
  WHERE user_id = p_user_id AND profile_id IS NOT NULL;
$$;
