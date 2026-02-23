-- Create blocks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS on blocks table
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can block others" ON public.blocks;
DROP POLICY IF EXISTS "Users can unblock others" ON public.blocks;
DROP POLICY IF EXISTS "Users can view their blocks" ON public.blocks;

-- Create RLS policies for blocks table
CREATE POLICY "Users can block others" ON public.blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others" ON public.blocks
  FOR DELETE USING (auth.uid() = blocker_id);

CREATE POLICY "Users can view their blocks" ON public.blocks
  FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

-- Create or replace the is_blocked function
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

-- Drop the conflicting "Anyone can read profiles" policy
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;

-- Update profiles RLS policy to hide blocked profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (NOT is_blocked(auth.uid(), id));

-- Create block_user function for clean blocking with relationship cleanup
CREATE OR REPLACE FUNCTION public.block_user(p_blocker uuid, p_blocked uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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