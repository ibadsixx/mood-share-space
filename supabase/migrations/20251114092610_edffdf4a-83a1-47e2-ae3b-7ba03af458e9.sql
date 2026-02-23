-- Create hashtag_follows table to track which users follow which hashtags
CREATE TABLE public.hashtag_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, hashtag_id)
);

-- Create index for faster queries
CREATE INDEX idx_hashtag_follows_user_id ON public.hashtag_follows(user_id);
CREATE INDEX idx_hashtag_follows_hashtag_id ON public.hashtag_follows(hashtag_id);

-- Enable RLS
ALTER TABLE public.hashtag_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all hashtag follows (to see follow counts)
CREATE POLICY "Hashtag follows are viewable by everyone"
  ON public.hashtag_follows
  FOR SELECT
  USING (true);

-- Users can follow hashtags
CREATE POLICY "Users can follow hashtags"
  ON public.hashtag_follows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unfollow hashtags they follow
CREATE POLICY "Users can unfollow hashtags"
  ON public.hashtag_follows
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add follower_count to hashtags table for tracking (optional but useful)
ALTER TABLE public.hashtags
ADD COLUMN follower_count integer DEFAULT 0;

-- Function to update follower count
CREATE OR REPLACE FUNCTION public.update_hashtag_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.hashtags
    SET follower_count = follower_count + 1
    WHERE id = NEW.hashtag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.hashtags
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE id = OLD.hashtag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger to automatically update follower count
CREATE TRIGGER update_hashtag_follower_count_trigger
  AFTER INSERT OR DELETE ON public.hashtag_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hashtag_follower_count();