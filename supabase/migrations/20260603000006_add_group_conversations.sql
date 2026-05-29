-- Add group chat support to conversations
-- 1. Add name column to conversations table (for group names)
-- 2. Create group conversation RPC
-- 3. Update get_conversations_with_info to handle groups

ALTER TABLE public.conversations ADD COLUMN name TEXT;

-- Create a group conversation with multiple participants
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_name TEXT,
  p_participant_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
  v_user_id UUID;
  v_pid UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR p_name = '' THEN
    RAISE EXCEPTION 'Group name is required';
  END IF;

  IF array_length(p_participant_ids, 1) IS NULL OR array_length(p_participant_ids, 1) < 2 THEN
    RAISE EXCEPTION 'At least 2 participants are required';
  END IF;

  -- Create the conversation
  INSERT INTO public.conversations (type, name, created_by)
  VALUES ('group', p_name, v_user_id)
  RETURNING id INTO v_conv_id;

  -- Add creator
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_conv_id, v_user_id);

  -- Add each participant
  FOREACH v_pid IN ARRAY p_participant_ids
  LOOP
    IF v_pid != v_user_id THEN
      INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES (v_conv_id, v_pid)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_conv_id;
END;
$$;

-- Update get_conversations_with_info to handle group conversations
-- For groups, returns conversation_name and the first non-current-user participant
DROP FUNCTION IF EXISTS public.get_conversations_with_info(uuid) CASCADE;
CREATE FUNCTION public.get_conversations_with_info(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  conversation_id uuid,
  type text,
  conversation_name text,
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
    c.name as conversation_name,
    c.created_at,
    c.updated_at,
    other_participant.user_id as other_user_id,
    other_participant.username as other_user_username,
    other_participant.display_name as other_user_display_name,
    other_participant.profile_pic as other_user_profile_pic,
    last_msg.content as last_message_content,
    last_msg.created_at as last_message_created_at,
    COALESCE(unread.count, 0) as unread_count
  FROM conversations c
  JOIN conversation_participants my_participation ON my_participation.conversation_id = c.id AND my_participation.user_id = p_user_id
  LEFT JOIN LATERAL (
    SELECT cp.user_id, p.username, p.display_name, p.profile_pic
    FROM conversation_participants cp
    JOIN profiles p ON p.id = cp.user_id
    WHERE cp.conversation_id = c.id AND cp.user_id != p_user_id
    LIMIT 1
  ) other_participant ON true
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at
    FROM messages m 
    WHERE m.conversation_id = c.id 
    ORDER BY m.created_at DESC 
    LIMIT 1
  ) last_msg ON true
  LEFT JOIN conversation_clears cc
    ON cc.conversation_id = c.id AND cc.user_id = p_user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id != p_user_id
      AND (cc.id IS NULL OR m.created_at > cc.cleared_at)
      AND NOT EXISTS (
        SELECT 1 FROM message_reads mr
        WHERE mr.message_id = m.id AND mr.user_id = p_user_id
      )
  ) unread ON true
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
