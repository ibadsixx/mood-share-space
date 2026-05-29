-- Add channel support to conversations
-- Owner publishes content, moderators help manage, followers receive content (read-only)

ALTER TABLE public.conversations ADD COLUMN description TEXT;

-- Extend role constraint to include channel roles
ALTER TABLE public.conversation_participants
  DROP CONSTRAINT IF EXISTS conversation_participants_role_check;
ALTER TABLE public.conversation_participants
  ADD CONSTRAINT conversation_participants_role_check
  CHECK (role IN ('owner', 'moderator', 'follower', 'member', 'admin'));

-- Create a channel conversation (creator becomes owner)
CREATE OR REPLACE FUNCTION public.create_channel_conversation(
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR p_name = '' THEN
    RAISE EXCEPTION 'Channel name is required';
  END IF;

  INSERT INTO public.conversations (type, name, description, created_by)
  VALUES ('channel', p_name, p_description, v_user_id)
  RETURNING id INTO v_conv_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (v_conv_id, v_user_id, 'owner');

  RETURN v_conv_id;
END;
$$;

-- Follow a channel (adds as follower, read-only)
CREATE OR REPLACE FUNCTION public.follow_channel(
  p_conversation_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_conv_type TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.type INTO v_conv_type
  FROM conversations c
  WHERE c.id = p_conversation_id;

  IF v_conv_type IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF v_conv_type != 'channel' THEN
    RAISE EXCEPTION 'Can only follow channel conversations';
  END IF;

  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (p_conversation_id, v_user_id, 'follower')
  ON CONFLICT (conversation_id, user_id) DO UPDATE SET role = 'follower';
END;
$$;

-- Unfollow a channel (follower leaves)
CREATE OR REPLACE FUNCTION public.unfollow_channel(
  p_conversation_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_conv_type TEXT;
  v_created_by UUID;
  v_role TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.type, c.created_by INTO v_conv_type, v_created_by
  FROM conversations c
  WHERE c.id = p_conversation_id;

  IF v_conv_type IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF v_conv_type != 'channel' THEN
    RAISE EXCEPTION 'Not a channel conversation';
  END IF;

  IF v_user_id = v_created_by THEN
    RAISE EXCEPTION 'Channel owner cannot unfollow. Delete the channel instead.';
  END IF;

  SELECT cp.role INTO v_role
  FROM conversation_participants cp
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_user_id;

  IF v_role = 'moderator' THEN
    RAISE EXCEPTION 'Moderators cannot unfollow themselves. Contact the channel owner.';
  END IF;

  DELETE FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id AND user_id = v_user_id;
END;
$$;

-- Delete a channel (owner only)
CREATE OR REPLACE FUNCTION public.delete_channel(
  p_conversation_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_created_by UUID;
  v_conv_type TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.type, c.created_by INTO v_conv_type, v_created_by
  FROM conversations c
  WHERE c.id = p_conversation_id;

  IF v_conv_type IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF v_conv_type != 'channel' THEN
    RAISE EXCEPTION 'Not a channel conversation';
  END IF;

  IF v_user_id != v_created_by THEN
    RAISE EXCEPTION 'Only the channel owner can delete the channel';
  END IF;

  DELETE FROM public.conversations WHERE id = p_conversation_id;
END;
$$;

-- Add a channel moderator (owner only)
CREATE OR REPLACE FUNCTION public.add_channel_moderator(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_conv_type TEXT;
  v_created_by UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.type, c.created_by INTO v_conv_type, v_created_by
  FROM conversations c
  WHERE c.id = p_conversation_id;

  IF v_conv_type IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF v_conv_type != 'channel' THEN
    RAISE EXCEPTION 'Not a channel conversation';
  END IF;

  IF v_user_id != v_created_by THEN
    RAISE EXCEPTION 'Only the channel owner can add moderators';
  END IF;

  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (p_conversation_id, p_user_id, 'moderator')
  ON CONFLICT (conversation_id, user_id) DO UPDATE SET role = 'moderator';
END;
$$;

-- Remove a channel moderator (owner only)
CREATE OR REPLACE FUNCTION public.remove_channel_moderator(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_conv_type TEXT;
  v_created_by UUID;
  v_target_role TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.type, c.created_by INTO v_conv_type, v_created_by
  FROM conversations c
  WHERE c.id = p_conversation_id;

  IF v_conv_type IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF v_conv_type != 'channel' THEN
    RAISE EXCEPTION 'Not a channel conversation';
  END IF;

  IF v_user_id != v_created_by THEN
    RAISE EXCEPTION 'Only the channel owner can remove moderators';
  END IF;

  SELECT cp.role INTO v_target_role
  FROM conversation_participants cp
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User is not a participant of this channel';
  END IF;

  IF v_target_role != 'moderator' THEN
    RAISE EXCEPTION 'User is not a moderator';
  END IF;

  UPDATE public.conversation_participants
  SET role = 'follower'
  WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
END;
$$;

-- Get channel members
CREATE OR REPLACE FUNCTION public.get_channel_members(
  p_conversation_id UUID
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  profile_pic TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not a participant of this conversation';
  END IF;

  RETURN QUERY
  SELECT
    cp.user_id,
    p.username,
    p.display_name,
    p.profile_pic,
    cp.role,
    cp.joined_at
  FROM conversation_participants cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.conversation_id = p_conversation_id
  ORDER BY
    CASE cp.role
      WHEN 'owner' THEN 0
      WHEN 'moderator' THEN 1
      WHEN 'follower' THEN 2
      ELSE 3
    END, p.display_name ASC;
END;
$$;

-- Check if current user can post in channel (owner or moderator)
CREATE OR REPLACE FUNCTION public.can_post_in_channel(
  p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT cp.role INTO v_role
  FROM conversation_participants cp
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_user_id;

  RETURN v_role IN ('owner', 'moderator');
END;
$$;

-- Get follower count for a channel
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
    (SELECT p.display_name FROM conversation_participants cp JOIN profiles p ON p.id = cp.user_id WHERE cp.conversation_id = p_conversation_id AND cp.role = 'owner' LIMIT 1) as owner_name,
    (SELECT COUNT(*)::BIGINT FROM conversation_participants WHERE conversation_id = p_conversation_id AND role = 'moderator') as moderator_count;
END;
$$;

-- Get current user's channel role
CREATE OR REPLACE FUNCTION public.get_channel_user_role(
  p_conversation_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT cp.role INTO v_role
  FROM conversation_participants cp
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = auth.uid();

  RETURN v_role;
END;
$$;

-- Update get_conversations_with_info to include description
CREATE OR REPLACE FUNCTION public.get_conversations_with_info(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  conversation_id uuid,
  type text,
  conversation_name text,
  conversation_description text,
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
    c.description as conversation_description,
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
