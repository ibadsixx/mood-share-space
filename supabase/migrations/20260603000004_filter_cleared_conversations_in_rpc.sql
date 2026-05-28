-- Update get_conversations_with_info to hide cleared conversations
-- A cleared conversation is hidden from the sidebar unless a new message
-- arrived after the clear (matching Instagram/Messenger behavior).

CREATE OR REPLACE FUNCTION public.get_conversations_with_info(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  conversation_id uuid,
  type text,
  created_at timestamptz,
  updated_at timestamptz,
  other_user_id uuid,
  other_user_username text,
  other_user_display_name text,
  other_user_profile_pic text,
  last_message_content text,
  last_message_created_at timestamptz,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as conversation_id,
    c.type,
    c.created_at,
    c.updated_at,
    other_participant.user_id as other_user_id,
    p.username as other_user_username,
    p.display_name as other_user_display_name,
    p.profile_pic as other_user_profile_pic,
    last_msg.content as last_message_content,
    last_msg.created_at as last_message_created_at,
    COALESCE(unread.count, 0) as unread_count
  FROM conversations c
  JOIN conversation_participants my_participation ON my_participation.conversation_id = c.id AND my_participation.user_id = p_user_id
  JOIN conversation_participants other_participant ON other_participant.conversation_id = c.id AND other_participant.user_id != p_user_id
  JOIN profiles p ON p.id = other_participant.user_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at
    FROM messages m 
    WHERE m.conversation_id = c.id 
    ORDER BY m.created_at DESC 
    LIMIT 1
  ) last_msg ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id != p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM message_reads mr
        WHERE mr.message_id = m.id AND mr.user_id = p_user_id
      )
  ) unread ON true
  LEFT JOIN conversation_clears cc
    ON cc.conversation_id = c.id AND cc.user_id = p_user_id
  WHERE
    cc.id IS NULL
    OR EXISTS (
      SELECT 1 FROM messages m
      WHERE m.conversation_id = c.id
        AND m.created_at > cc.cleared_at
    )
  ORDER BY GREATEST(c.updated_at, last_msg.created_at) DESC NULLS LAST;
END;
$$;
