-- Add audience columns to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audience_type text DEFAULT 'public';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audience_excluded_user_ids uuid[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audience_user_ids uuid[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audience_list_id uuid;

-- Create audience_lists table for custom lists
CREATE TABLE IF NOT EXISTS audience_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  member_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on audience_lists
ALTER TABLE audience_lists ENABLE ROW LEVEL SECURITY;

-- Create policies for audience_lists
CREATE POLICY "Users can manage their own audience lists" 
ON audience_lists 
FOR ALL 
USING (auth.uid() = owner_id);

-- Create function to check if two users are friends
CREATE OR REPLACE FUNCTION public.is_friend(viewer_id uuid, target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM friends 
    WHERE ((requester_id = viewer_id AND receiver_id = target_id) 
           OR (requester_id = target_id AND receiver_id = viewer_id))
    AND status = 'accepted'
  );
$$;

-- Create function to check if user can view post based on audience
CREATE OR REPLACE FUNCTION public.can_view_post(viewer_id uuid, post_user_id uuid, audience_type text, audience_user_ids uuid[], audience_excluded_user_ids uuid[], audience_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Author can always view their own posts
    WHEN viewer_id = post_user_id THEN true
    -- Public posts are visible to everyone
    WHEN audience_type = 'public' THEN true
    -- Only me posts are only visible to author
    WHEN audience_type = 'only_me' THEN false
    -- Specific friends posts
    WHEN audience_type = 'specific' THEN viewer_id = ANY(COALESCE(audience_user_ids, '{}'))
    -- Friends posts (all friends)
    WHEN audience_type = 'friends' THEN public.is_friend(viewer_id, post_user_id)
    -- Friends except specific users
    WHEN audience_type = 'friends_except' THEN 
      public.is_friend(viewer_id, post_user_id) 
      AND NOT (viewer_id = ANY(COALESCE(audience_excluded_user_ids, '{}')))
    -- Custom list posts
    WHEN audience_type = 'custom_list' THEN 
      EXISTS (
        SELECT 1 
        FROM audience_lists 
        WHERE id = audience_list_id 
        AND viewer_id = ANY(member_ids)
      )
    -- Default deny
    ELSE false
  END;
$$;

-- Update the posts RLS policy to use audience checking
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;

CREATE POLICY "Posts are viewable based on audience" 
ON posts 
FOR SELECT 
USING (
  public.can_view_post(
    auth.uid(),
    user_id,
    COALESCE(audience_type, 'public'),
    audience_user_ids,
    audience_excluded_user_ids,
    audience_list_id
  )
);

-- Add trigger for audience_lists updated_at
CREATE TRIGGER update_audience_lists_updated_at
BEFORE UPDATE ON audience_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();