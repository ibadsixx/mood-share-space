-- Create pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create function to notify followers when a hashtag is used
CREATE OR REPLACE FUNCTION notify_hashtag_followers()
RETURNS TRIGGER AS $$
DECLARE
  v_hashtag_id uuid;
  v_post_user_id uuid;
  v_follower record;
BEGIN
  -- Get the post's user_id
  SELECT user_id INTO v_post_user_id
  FROM posts
  WHERE id = NEW.source_id AND NEW.source_type = 'post';
  
  -- Skip if post not found or not a post source
  IF v_post_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  v_hashtag_id := NEW.hashtag_id;
  
  -- Notify all followers of this hashtag (except the post author)
  FOR v_follower IN 
    SELECT hf.user_id, h.tag
    FROM hashtag_follows hf
    JOIN hashtags h ON h.id = hf.hashtag_id
    WHERE hf.hashtag_id = v_hashtag_id
    AND hf.user_id != v_post_user_id
  LOOP
    -- Check if user has hashtag notifications enabled (default true)
    IF NOT EXISTS (
      SELECT 1 FROM privacy_settings 
      WHERE user_id = v_follower.user_id 
      AND setting_name = 'hashtag_notifications' 
      AND setting_value = 'false'
    ) THEN
      INSERT INTO notifications (user_id, actor_id, type, message, post_id)
      VALUES (
        v_follower.user_id,
        v_post_user_id,
        'hashtag_use',
        'used #' || v_follower.tag || ' that you follow',
        NEW.source_id
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for hashtag link insertions
CREATE TRIGGER on_hashtag_link_insert
  AFTER INSERT ON hashtag_links
  FOR EACH ROW
  EXECUTE FUNCTION notify_hashtag_followers();

-- Create index for faster hashtag searches
CREATE INDEX IF NOT EXISTS idx_hashtags_tag_trgm ON hashtags USING gin(tag gin_trgm_ops);

-- Create view for hashtag analytics
CREATE OR REPLACE VIEW hashtag_analytics AS
SELECT 
  h.id,
  h.tag,
  h.follower_count,
  COUNT(DISTINCT hl.source_id) FILTER (WHERE hl.source_type = 'post') as post_count,
  COUNT(DISTINCT hl.source_id) FILTER (WHERE hl.created_at >= NOW() - INTERVAL '1 hour') as posts_last_hour,
  COUNT(DISTINCT hl.source_id) FILTER (WHERE hl.created_at >= NOW() - INTERVAL '1 day') as posts_last_day,
  COUNT(DISTINCT hl.source_id) FILTER (WHERE hl.created_at >= NOW() - INTERVAL '7 days') as posts_last_week,
  COUNT(DISTINCT hl.source_id) FILTER (WHERE hl.created_at >= NOW() - INTERVAL '30 days') as posts_last_month,
  COUNT(DISTINCT hl.source_id) FILTER (WHERE hl.created_at >= NOW() - INTERVAL '365 days') as posts_last_year,
  h.created_at
FROM hashtags h
LEFT JOIN hashtag_links hl ON hl.hashtag_id = h.id
GROUP BY h.id, h.tag, h.follower_count, h.created_at;