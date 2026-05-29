-- Backfill blocked_users data into blocks table, then drop blocked_users
-- All frontend code has been migrated to use the blocks table via block_user RPC

BEGIN;

-- Insert any blocked_users rows that don't already exist in blocks
INSERT INTO public.blocks (blocker_id, blocked_id, created_at)
SELECT
  bu.user_id,
  bu.blocked_user_id,
  bu.created_at
FROM public.blocked_users bu
WHERE NOT EXISTS (
  SELECT 1 FROM public.blocks b
  WHERE b.blocker_id = bu.user_id AND b.blocked_id = bu.blocked_user_id
);

-- Drop dependent objects that reference blocked_users
DROP POLICY IF EXISTS "Users can view their own blocked users" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can block other users" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can unblock other users" ON public.blocked_users;

-- Recreate the message_requests insert policy to use blocks table instead of blocked_users
DROP POLICY IF EXISTS "Users can send message requests" ON public.message_requests;
CREATE POLICY "Users can send message requests"
  ON public.message_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks
      WHERE (blocker_id = receiver_id AND blocked_id = sender_id)
         OR (blocker_id = sender_id AND blocked_id = receiver_id)
    )
  );

-- Drop the table
DROP TABLE IF EXISTS public.blocked_users;

COMMIT;
