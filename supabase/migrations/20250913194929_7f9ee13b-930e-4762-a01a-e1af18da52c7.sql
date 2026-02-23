-- Create blocks table
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS on blocks table
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies for blocks table
CREATE POLICY "Users can block others" 
ON public.blocks 
FOR INSERT 
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others" 
ON public.blocks 
FOR DELETE 
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can view their blocks" 
ON public.blocks 
FOR SELECT 
USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

-- Create block_user function
CREATE OR REPLACE FUNCTION public.block_user(p_blocker uuid, p_blocked uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into blocks (on conflict do nothing)
  INSERT INTO blocks (blocker_id, blocked_id)
  VALUES (p_blocker, p_blocked)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  
  -- Delete any friendships between the two users
  DELETE FROM friends 
  WHERE (requester_id = p_blocker AND receiver_id = p_blocked)
     OR (requester_id = p_blocked AND receiver_id = p_blocker);
  
  -- Delete follower relations between the two users
  DELETE FROM followers 
  WHERE (follower_id = p_blocker AND following_id = p_blocked)
     OR (follower_id = p_blocked AND following_id = p_blocker);
END;
$$;

-- Helper function to check if users are blocked
CREATE OR REPLACE FUNCTION public.is_blocked(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocks 
    WHERE (blocker_id = user1_id AND blocked_id = user2_id)
       OR (blocker_id = user2_id AND blocked_id = user1_id)
  );
$$;

-- Update posts RLS policy to respect blocks
DROP POLICY IF EXISTS "Posts are viewable based on audience and status" ON posts;
CREATE POLICY "Posts are viewable based on audience and status" 
ON posts 
FOR SELECT 
USING (
  CASE
    WHEN status = 'scheduled' THEN (user_id = auth.uid())
    WHEN status = 'published' THEN 
      can_view_post(auth.uid(), user_id, COALESCE(audience_type, 'public'), audience_user_ids, audience_excluded_user_ids, audience_list_id)
      AND NOT is_blocked(auth.uid(), user_id)
    WHEN status = 'draft' THEN (user_id = auth.uid())
    ELSE false
  END
);

-- Update profiles RLS policy to respect blocks
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles 
FOR SELECT 
USING (NOT is_blocked(auth.uid(), id));

-- Update messages RLS policy to respect blocks
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages" 
ON messages 
FOR SELECT 
USING (
  (auth.uid() = sender_id OR auth.uid() = receiver_id)
  AND NOT is_blocked(sender_id, receiver_id)
);

-- Update messages insert policy to respect blocks
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" 
ON messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id 
  AND NOT is_blocked(sender_id, receiver_id)
);

-- Update friends RLS policies to respect blocks
DROP POLICY IF EXISTS "Users can create friend requests" ON friends;
CREATE POLICY "Users can create friend requests" 
ON friends 
FOR INSERT 
WITH CHECK (
  auth.uid() = requester_id 
  AND NOT is_blocked(requester_id, receiver_id)
);

-- Update followers RLS policies to respect blocks
DROP POLICY IF EXISTS "Users can create their own follows" ON followers;
CREATE POLICY "Users can create their own follows" 
ON followers 
FOR INSERT 
WITH CHECK (
  auth.uid() = follower_id 
  AND NOT is_blocked(follower_id, following_id)
);