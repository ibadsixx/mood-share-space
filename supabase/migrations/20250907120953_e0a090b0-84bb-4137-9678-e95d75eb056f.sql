-- Add audience fields to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audience_type text DEFAULT 'public';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audience_excluded_user_ids uuid[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audience_user_ids uuid[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audience_list_id uuid;

-- Create audience_lists table for custom lists
CREATE TABLE IF NOT EXISTS audience_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  member_ids uuid[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on audience_lists
ALTER TABLE audience_lists ENABLE ROW LEVEL SECURITY;

-- RLS policies for audience_lists
CREATE POLICY "Users can manage their own audience lists"
ON audience_lists
FOR ALL
USING (auth.uid() = owner_id);

-- Create function to check if users are friends
CREATE OR REPLACE FUNCTION public.is_friend(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friends 
    WHERE ((requester_id = user1_id AND receiver_id = user2_id) 
           OR (requester_id = user2_id AND receiver_id = user1_id))
    AND status = 'accepted'
  );
$$;

-- Create function to check if user can view post based on audience
CREATE OR REPLACE FUNCTION public.can_view_post(post_user_id uuid, post_audience_type text, post_audience_user_ids uuid[], post_audience_excluded_user_ids uuid[], post_audience_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN post_audience_type = 'public' THEN true
    WHEN post_audience_type = 'only_me' THEN auth.uid() = post_user_id
    WHEN post_audience_type = 'friends' THEN 
      auth.uid() = post_user_id OR public.is_friend(auth.uid(), post_user_id)
    WHEN post_audience_type = 'friends_except' THEN 
      (auth.uid() = post_user_id OR public.is_friend(auth.uid(), post_user_id))
      AND NOT (auth.uid() = ANY(post_audience_excluded_user_ids))
    WHEN post_audience_type = 'specific' THEN 
      auth.uid() = post_user_id OR auth.uid() = ANY(post_audience_user_ids)
    WHEN post_audience_type = 'custom_list' THEN 
      auth.uid() = post_user_id OR 
      auth.uid() = ANY((SELECT member_ids FROM audience_lists WHERE id = post_audience_list_id))
    ELSE false
  END;
$$;

-- Update posts RLS policy to use audience function
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;

CREATE POLICY "Posts are viewable based on audience"
ON posts
FOR SELECT
USING (
  public.can_view_post(
    user_id, 
    audience_type, 
    audience_user_ids, 
    audience_excluded_user_ids, 
    audience_list_id
  )
);

-- Create trigger for audience_lists updated_at
CREATE TRIGGER update_audience_lists_updated_at
BEFORE UPDATE ON audience_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();