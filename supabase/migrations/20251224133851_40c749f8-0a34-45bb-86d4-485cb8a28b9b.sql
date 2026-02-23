-- Create group_posts table for sharing reels/posts to groups
CREATE TABLE public.group_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, post_id, shared_by)
);

-- Create profile_posts table for sharing reels/posts to friend's profiles
CREATE TABLE public.profile_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, post_id, shared_by)
);

-- Enable RLS on both tables
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_posts ENABLE ROW LEVEL SECURITY;

-- RLS for group_posts: members can view, authenticated can insert if member
CREATE POLICY "Group members can view group posts"
  ON public.group_posts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = group_posts.group_id 
    AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Group members can share posts to groups"
  ON public.group_posts FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by AND
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_members.group_id = group_posts.group_id 
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own group shares"
  ON public.group_posts FOR DELETE
  USING (auth.uid() = shared_by);

-- RLS for profile_posts: profile owner and sharer can view
CREATE POLICY "Profile owners and sharers can view profile posts"
  ON public.profile_posts FOR SELECT
  USING (auth.uid() = profile_id OR auth.uid() = shared_by);

CREATE POLICY "Users can share posts to friend profiles"
  ON public.profile_posts FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by AND
    auth.uid() != profile_id AND
    EXISTS (
      SELECT 1 FROM public.friends 
      WHERE status = 'accepted' AND (
        (requester_id = auth.uid() AND receiver_id = profile_posts.profile_id) OR
        (receiver_id = auth.uid() AND requester_id = profile_posts.profile_id)
      )
    )
  );

CREATE POLICY "Users can delete their own profile shares"
  ON public.profile_posts FOR DELETE
  USING (auth.uid() = shared_by);

-- Create indexes for performance
CREATE INDEX idx_group_posts_group_id ON public.group_posts(group_id);
CREATE INDEX idx_group_posts_post_id ON public.group_posts(post_id);
CREATE INDEX idx_profile_posts_profile_id ON public.profile_posts(profile_id);
CREATE INDEX idx_profile_posts_post_id ON public.profile_posts(post_id);