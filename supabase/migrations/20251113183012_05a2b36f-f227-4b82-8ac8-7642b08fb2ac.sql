-- Create hashtags table
CREATE TABLE public.hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create hashtag_links table
CREATE TABLE public.hashtag_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('post', 'comment')),
  source_id uuid NOT NULL,
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtag_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hashtags
CREATE POLICY "Hashtags are viewable by everyone"
  ON public.hashtags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create hashtags"
  ON public.hashtags FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for hashtag_links
CREATE POLICY "Hashtag links are viewable by everyone"
  ON public.hashtag_links FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create hashtag links"
  ON public.hashtag_links FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own hashtag links"
  ON public.hashtag_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = hashtag_links.source_id
        AND posts.user_id = auth.uid()
        AND hashtag_links.source_type = 'post'
    )
    OR EXISTS (
      SELECT 1 FROM public.comments
      WHERE comments.id = hashtag_links.source_id
        AND comments.user_id = auth.uid()
        AND hashtag_links.source_type = 'comment'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_hashtags_tag ON public.hashtags(tag);
CREATE INDEX idx_hashtag_links_source ON public.hashtag_links(source_type, source_id);
CREATE INDEX idx_hashtag_links_hashtag ON public.hashtag_links(hashtag_id);