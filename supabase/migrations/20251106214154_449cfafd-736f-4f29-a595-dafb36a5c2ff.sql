-- Create saved_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can manage their own saved posts" ON public.saved_posts;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can manage their own saved posts"
  ON public.saved_posts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON public.saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON public.saved_posts(post_id);

-- Create reported_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reported_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  reported_by UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reported_posts ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can create reports" ON public.reported_posts;
  DROP POLICY IF EXISTS "Users can view their own reports" ON public.reported_posts;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can create reports"
  ON public.reported_posts
  FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own reports"
  ON public.reported_posts
  FOR SELECT
  USING (auth.uid() = reported_by);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reported_posts_post_id ON public.reported_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_reported_posts_reported_by ON public.reported_posts(reported_by);