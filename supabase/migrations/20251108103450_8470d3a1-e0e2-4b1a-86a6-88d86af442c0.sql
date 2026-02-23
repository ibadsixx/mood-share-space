-- Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  views INTEGER NOT NULL DEFAULT 0,
  viewed_by UUID[] NOT NULL DEFAULT '{}'
);

-- Create index for faster queries
CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX idx_stories_created_at ON public.stories(created_at DESC);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Stories are viewable by everyone"
  ON public.stories
  FOR SELECT
  USING (expires_at > NOW() AND NOT is_blocked(auth.uid(), user_id));

CREATE POLICY "Users can create their own stories"
  ON public.stories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
  ON public.stories
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON public.stories
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;

-- Create storage bucket for stories
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for stories bucket
CREATE POLICY "Stories are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'stories');

CREATE POLICY "Users can upload their own stories"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'stories' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own stories"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'stories' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );