-- Create post_shares table for reel/post shares
CREATE TABLE IF NOT EXISTS public.post_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public',
  message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

-- FK references (profiles is the public user table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'post_shares'
      AND constraint_name = 'post_shares_post_id_fkey'
  ) THEN
    ALTER TABLE public.post_shares
      ADD CONSTRAINT post_shares_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES public.posts(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'post_shares'
      AND constraint_name = 'post_shares_user_id_fkey'
  ) THEN
    ALTER TABLE public.post_shares
      ADD CONSTRAINT post_shares_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_post_shares_post_id_created_at ON public.post_shares (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_shares_user_id_created_at ON public.post_shares (user_id, created_at DESC);

-- RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='post_shares' AND policyname='Users can view their own post shares'
  ) THEN
    CREATE POLICY "Users can view their own post shares"
    ON public.post_shares
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='post_shares' AND policyname='Users can create their own post shares'
  ) THEN
    CREATE POLICY "Users can create their own post shares"
    ON public.post_shares
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='post_shares' AND policyname='Users can delete their own post shares'
  ) THEN
    CREATE POLICY "Users can delete their own post shares"
    ON public.post_shares
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add shares_count to posts (required by UI spec) without breaking existing share_count usage
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS shares_count INTEGER NOT NULL DEFAULT 0;

-- Atomic share counter increment (avoids race condition)
CREATE OR REPLACE FUNCTION public.increment_post_share_counts(p_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET
    share_count  = COALESCE(share_count, 0) + 1,
    shares_count = COALESCE(shares_count, 0) + 1
  WHERE id = p_post_id;
END;
$$;