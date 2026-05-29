-- Add group roles and member management
-- 1. Add role column to conversation_participants
-- 2. Add can_add_members column to conversations
-- 3. Update create_group_conversation to accept admin_ids and can_add_members
-- 4. Add member management RPCs

-- Add role to participants ('member', 'admin')
ALTER TABLE public.conversation_participants ADD COLUMN role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('member', 'admin'));

-- Who can add new members ('anyone' or 'admins_only')
ALTER TABLE public.conversations ADD COLUMN can_add_members TEXT NOT NULL DEFAULT 'admins_only'
  CHECK (can_add_members IN ('anyone', 'admins_only'));

-- Update create_group_conversation to accept admin_ids and can_add_members
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_name TEXT,
  p_participant_ids UUID[],
  p_admin_ids UUID[] DEFAULT '{}',
  p_can_add_members TEXT DEFAULT 'admins_only'
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
  v_is_admin BOOLEAN;
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

  IF p_can_add_members NOT IN ('anyone', 'admins_only') THEN
    RAISE EXCEPTION 'can_add_members must be anyone or admins_only';
  END IF;

  -- Create the conversation
  INSERT INTO public.conversations (type, name, created_by, can_add_members)
  VALUES ('group', p_name, v_user_id, p_can_add_members)
  RETURNING id INTO v_conv_id;

  -- Add creator as admin
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (v_conv_id, v_user_id, 'admin');

  -- Add each participant
  FOREACH v_pid IN ARRAY p_participant_ids
  LOOP
    IF v_pid != v_user_id THEN
      v_is_admin := v_pid = ANY(p_admin_ids);
      INSERT INTO public.conversation_participants (conversation_id, user_id, role)
      VALUES (v_conv_id, v_pid, CASE WHEN v_is_admin THEN 'admin' ELSE 'member' END)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_conv_id;
END;
$$;

-- Add group member (with permission check)
CREATE OR REPLACE FUNCTION public.add_group_member(
  p_conversation_id UUID,
  p_new_member_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_can_add TEXT;
  v_conv_type TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get conversation type and can_add_members setting
  SELECT c.type, c.can_add_members INTO v_conv_type, v_can_add
  FROM conversations c
  WHERE c.id = p_conversation_id;

  IF v_conv_type IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF v_conv_type != 'group' THEN
    RAISE EXCEPTION 'Can only add members to group conversations';
  END IF;

  -- Check permission
  IF v_can_add = 'admins_only' THEN
    SELECT cp.role INTO v_role
    FROM conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_user_id;

    IF v_role IS NULL THEN
      RAISE EXCEPTION 'You are not a participant of this conversation';
    END IF;

    IF v_role != 'admin' THEN
      RAISE EXCEPTION 'Only admins can add members to this group';
    END IF;
  ELSE
    -- anyone — still need to be a participant
    IF NOT EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = p_conversation_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'You are not a participant of this conversation';
    END IF;
  END IF;

  -- Add the new member
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (p_conversation_id, p_new_member_id, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$$;

-- Remove group member (admin only)
CREATE OR REPLACE FUNCTION public.remove_group_member(
  p_conversation_id UUID,
  p_member_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_target_role TEXT;
  v_created_by UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get caller role and target role
  SELECT cp.role INTO v_role
  FROM conversation_participants cp
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'You are not a participant of this conversation';
  END IF;

  SELECT cp.role, c.created_by INTO v_target_role, v_created_by
  FROM conversation_participants cp
  JOIN conversations c ON c.id = cp.conversation_id
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = p_member_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not a participant';
  END IF;

  -- Cannot remove the owner
  IF p_member_id = v_created_by THEN
    RAISE EXCEPTION 'Cannot remove the group owner';
  END IF;

  -- Only admins can remove members
  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can remove members';
  END IF;

  -- Admins cannot remove other admins (only the owner can)
  IF v_target_role = 'admin' AND v_user_id != v_created_by THEN
    RAISE EXCEPTION 'Only the group owner can remove admins';
  END IF;

  DELETE FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id AND user_id = p_member_id;
END;
$$;

-- Update member role (owner only)
CREATE OR REPLACE FUNCTION public.update_group_member_role(
  p_conversation_id UUID,
  p_member_id UUID,
  p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_created_by UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_role NOT IN ('member', 'admin') THEN
    RAISE EXCEPTION 'Role must be member or admin';
  END IF;

  -- Only the creator/owner can change roles
  SELECT created_by INTO v_created_by
  FROM conversations
  WHERE id = p_conversation_id;

  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF v_user_id != v_created_by THEN
    RAISE EXCEPTION 'Only the group owner can change roles';
  END IF;

  -- Cannot change the owner's role
  IF p_member_id = v_created_by THEN
    RAISE EXCEPTION 'Cannot change the group owner role';
  END IF;

  UPDATE public.conversation_participants
  SET role = p_role
  WHERE conversation_id = p_conversation_id AND user_id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found in this conversation';
  END IF;
END;
$$;

-- Get group members with their roles
CREATE OR REPLACE FUNCTION public.get_group_members(
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
  ORDER BY cp.role DESC, p.display_name ASC;
END;
$$;
