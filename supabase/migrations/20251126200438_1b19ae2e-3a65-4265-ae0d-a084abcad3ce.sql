-- Create reels_comments table
CREATE TABLE IF NOT EXISTS public.reels_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ NULL
);

-- Create reels_likes table
CREATE TABLE IF NOT EXISTS public.reels_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

-- Create reels_activity table for notifications
CREATE TABLE IF NOT EXISTS public.reels_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verb TEXT NOT NULL CHECK (verb IN ('like', 'comment')),
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add aggregated counters to posts table
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reels_comments_reel_id ON public.reels_comments(reel_id);
CREATE INDEX IF NOT EXISTS idx_reels_comments_author_id ON public.reels_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_reels_likes_reel_id ON public.reels_likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_reels_likes_user_id ON public.reels_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_activity_reel_id ON public.reels_activity(reel_id);
CREATE INDEX IF NOT EXISTS idx_reels_activity_actor_id ON public.reels_activity(actor_id);

-- Function to update comments count
CREATE OR REPLACE FUNCTION public.update_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update likes count
CREATE OR REPLACE FUNCTION public.update_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_reel_comments_count ON public.reels_comments;
CREATE TRIGGER trigger_update_reel_comments_count
  AFTER INSERT OR DELETE ON public.reels_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_reel_comments_count();

DROP TRIGGER IF EXISTS trigger_update_reel_likes_count ON public.reels_likes;
CREATE TRIGGER trigger_update_reel_likes_count
  AFTER INSERT OR DELETE ON public.reels_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_reel_likes_count();

-- RLS Policies for reels_comments
ALTER TABLE public.reels_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON public.reels_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert comments"
  ON public.reels_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments"
  ON public.reels_comments FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments"
  ON public.reels_comments FOR UPDATE
  USING (auth.uid() = author_id);

-- RLS Policies for reels_likes
ALTER TABLE public.reels_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON public.reels_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own likes"
  ON public.reels_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.reels_likes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for reels_activity
ALTER TABLE public.reels_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activity"
  ON public.reels_activity FOR SELECT
  USING (true);

CREATE POLICY "System can insert activity"
  ON public.reels_activity FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

-- RPC function to toggle like
CREATE OR REPLACE FUNCTION public.toggle_reel_like(p_reel_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_existing_like UUID;
  v_likes_count INTEGER;
  v_is_liked BOOLEAN;
BEGIN
  -- Validate user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check if like exists
  SELECT id INTO v_existing_like
  FROM public.reels_likes
  WHERE reel_id = p_reel_id AND user_id = p_user_id;

  IF v_existing_like IS NOT NULL THEN
    -- Unlike
    DELETE FROM public.reels_likes WHERE id = v_existing_like;
    v_is_liked := false;
  ELSE
    -- Like
    INSERT INTO public.reels_likes (reel_id, user_id)
    VALUES (p_reel_id, p_user_id);
    
    -- Log activity
    INSERT INTO public.reels_activity (reel_id, actor_id, verb)
    VALUES (p_reel_id, p_user_id, 'like');
    
    v_is_liked := true;
  END IF;

  -- Get updated count
  SELECT likes_count INTO v_likes_count
  FROM public.posts
  WHERE id = p_reel_id;

  RETURN json_build_object(
    'likes_count', v_likes_count,
    'is_liked', v_is_liked
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC function to add comment
CREATE OR REPLACE FUNCTION public.add_reel_comment(p_reel_id UUID, p_user_id UUID, p_body TEXT)
RETURNS JSON AS $$
DECLARE
  v_comment_id UUID;
  v_result JSON;
BEGIN
  -- Validate user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Validate body
  IF LENGTH(TRIM(p_body)) = 0 THEN
    RAISE EXCEPTION 'Comment body cannot be empty';
  END IF;

  -- Insert comment
  INSERT INTO public.reels_comments (reel_id, author_id, body)
  VALUES (p_reel_id, p_user_id, p_body)
  RETURNING id INTO v_comment_id;

  -- Log activity
  INSERT INTO public.reels_activity (reel_id, actor_id, verb, meta)
  VALUES (p_reel_id, p_user_id, 'comment', json_build_object('comment_id', v_comment_id));

  -- Return comment with author info
  SELECT json_build_object(
    'id', c.id,
    'reel_id', c.reel_id,
    'body', c.body,
    'created_at', c.created_at,
    'author', json_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'profile_pic', p.profile_pic
    )
  ) INTO v_result
  FROM public.reels_comments c
  JOIN public.profiles p ON p.id = c.author_id
  WHERE c.id = v_comment_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;