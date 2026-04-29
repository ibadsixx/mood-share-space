CREATE TABLE public.post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, tagged_user_id)
);

CREATE INDEX idx_post_tags_tagged_user ON public.post_tags(tagged_user_id);
CREATE INDEX idx_post_tags_post ON public.post_tags(post_id);

ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post tags are viewable by everyone"
ON public.post_tags FOR SELECT
USING (true);

CREATE POLICY "Users can tag others in their own posts"
ON public.post_tags FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = tagged_by
  AND EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

CREATE POLICY "Post owner or tagger can remove tags"
ON public.post_tags FOR DELETE
TO authenticated
USING (
  auth.uid() = tagged_by
  OR auth.uid() = tagged_user_id
  OR EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);