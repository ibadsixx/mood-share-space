-- Friend request RPC functions.
-- Route accept/reject/cancel through SECURITY DEFINER functions so the actions
-- are authoritative and not dependent on RLS UPDATE/DELETE policies on `friends`.
-- Mirrors the existing `block_user` SECURITY DEFINER pattern.

-- Accept an incoming friend request (only the receiver may accept).
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_friendship_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE friends
  SET status = 'accepted'
  WHERE id = p_friendship_id
    AND receiver_id = auth.uid()
    AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Reject an incoming friend request (only the receiver may reject).
CREATE OR REPLACE FUNCTION public.reject_friend_request(p_friendship_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE friends
  SET status = 'rejected'
  WHERE id = p_friendship_id
    AND receiver_id = auth.uid()
    AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Cancel a sent friend request, or unfriend (only the requester may cancel/unfriend).
CREATE OR REPLACE FUNCTION public.cancel_friend_request(p_friendship_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM friends
  WHERE id = p_friendship_id
    AND requester_id = auth.uid();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

-- Remove a friendship / relationship row (either involved user may remove).
CREATE OR REPLACE FUNCTION public.remove_friendship(p_friendship_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM friends
  WHERE id = p_friendship_id
    AND (requester_id = auth.uid() OR receiver_id = auth.uid());

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;
