-- Function to get people you may know suggestions
CREATE OR REPLACE FUNCTION public.get_people_you_may_know(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  profile_pic text,
  mutual_friends_count integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.profile_pic,
    public.get_mutual_friends_count(p_user_id, p.id) AS mutual_friends_count
  FROM profiles p
  WHERE 
    -- Exclude the current user
    p.id != p_user_id
    -- Exclude users who are already friends or have pending requests
    AND NOT EXISTS (
      SELECT 1 FROM friends f
      WHERE (f.requester_id = p_user_id AND f.receiver_id = p.id)
         OR (f.requester_id = p.id AND f.receiver_id = p_user_id)
    )
    -- Exclude blocked users (both directions)
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = p_user_id AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = p_user_id)
    )
    -- Exclude users already being followed
    AND NOT EXISTS (
      SELECT 1 FROM followers fl
      WHERE fl.follower_id = p_user_id AND fl.following_id = p.id
    )
  ORDER BY 
    public.get_mutual_friends_count(p_user_id, p.id) DESC,
    p.created_at DESC
  LIMIT p_limit;
END;
$$;