-- =============================================
-- Add block_type column and differentiate RLS
-- =============================================

-- 1. Add block_type column (safe for re-run)
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS block_type VARCHAR(50) NOT NULL DEFAULT 'full';

-- 2. Update is_blocked to accept optional block_type filter
--    When p_block_type is NULL, checks all blocks (backward compatible)
--    When p_block_type is set, only checks blocks of that type
CREATE OR REPLACE FUNCTION public.is_blocked(
  user1_id uuid,
  user2_id uuid,
  p_block_type VARCHAR DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE ((blocker_id = user1_id AND blocked_id = user2_id)
        OR (blocker_id = user2_id AND blocked_id = user1_id))
      AND (p_block_type IS NULL OR block_type = p_block_type)
  );
$$;

-- 3. Recreate block_user to accept and store block_type
CREATE OR REPLACE FUNCTION public.block_user(
  p_blocker uuid,
  p_blocked uuid,
  p_block_type VARCHAR DEFAULT 'full'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO blocks (blocker_id, blocked_id, block_type)
  VALUES (p_blocker, p_blocked, p_block_type)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  -- Only full block removes friendships and follows
  IF p_block_type = 'full' THEN
    DELETE FROM friends
    WHERE (requester_id = p_blocker AND receiver_id = p_blocked)
       OR (requester_id = p_blocked AND receiver_id = p_blocker);

    DELETE FROM followers
    WHERE (follower_id = p_blocker AND following_id = p_blocked)
       OR (follower_id = p_blocked AND following_id = p_blocker);
  END IF;
END;
$$;

-- 4. Update RLS policies to differentiate block types
--    Profiles/Posts: only full blocks hide content (messaging blocks only affect communication)
--    Messages/Friends/Followers: check all block types

-- Profiles: only full blocks hide profile
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON profiles
FOR SELECT
USING (NOT is_blocked(auth.uid(), id, 'full'));

-- Posts: only full blocks hide posts
DROP POLICY IF EXISTS "Posts are viewable based on audience and status" ON posts;
CREATE POLICY "Posts are viewable based on audience and status"
ON posts
FOR SELECT
USING (
  CASE
    WHEN status = 'scheduled' THEN (user_id = auth.uid())
    WHEN status = 'published' THEN
      can_view_post(auth.uid(), user_id, COALESCE(audience_type, 'public'), audience_user_ids, audience_excluded_user_ids, audience_list_id)
      AND NOT is_blocked(auth.uid(), user_id, 'full')
    WHEN status = 'draft' THEN (user_id = auth.uid())
    ELSE false
  END
);
