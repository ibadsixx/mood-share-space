-- Fix get_channel_stats to handle deleted owner profiles gracefully
CREATE OR REPLACE FUNCTION public.get_channel_stats(
  p_conversation_id UUID
)
RETURNS TABLE (
  follower_count BIGINT,
  owner_name TEXT,
  moderator_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::BIGINT FROM conversation_participants WHERE conversation_id = p_conversation_id AND role = 'follower') as follower_count,
    COALESCE(
      (SELECT p.display_name FROM conversation_participants cp JOIN profiles p ON p.id = cp.user_id WHERE cp.conversation_id = p_conversation_id AND cp.role = 'owner' LIMIT 1),
      'Unknown'
    ) as owner_name,
    (SELECT COUNT(*)::BIGINT FROM conversation_participants WHERE conversation_id = p_conversation_id AND role = 'moderator') as moderator_count;
END;
$$;
