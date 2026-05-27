-- Fix remaining RLS policies that don't differentiate block_type
-- Profiles and posts were fixed in 20260530000000, but friends, followers, and stories
-- still check all block types when they should only check 'full' blocks.
-- A 'messaging' block should only restrict messages/comments, not hide stories or prevent following.

-- 1. Stories: only full blocks should hide stories
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;
CREATE POLICY "Stories are viewable by everyone" ON stories
FOR SELECT USING (
  (expires_at > now())
  AND (
    auth.uid() IS NULL
    OR NOT is_blocked(auth.uid(), user_id, 'full')
  )
);

-- 2. Friends: only full blocks should prevent friend requests
DROP POLICY IF EXISTS "Users can create friend requests" ON friends;
CREATE POLICY "Users can create friend requests"
ON friends
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
  AND NOT is_blocked(requester_id, receiver_id, 'full')
);

-- 3. Followers: only full blocks should prevent following
DROP POLICY IF EXISTS "Users can create their own follows" ON followers;
CREATE POLICY "Users can create their own follows"
ON followers
FOR INSERT
WITH CHECK (
  auth.uid() = follower_id
  AND NOT is_blocked(follower_id, following_id, 'full')
);
