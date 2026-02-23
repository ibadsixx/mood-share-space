-- Drop and recreate the view without security definer
DROP VIEW IF EXISTS hashtag_analytics;

CREATE VIEW hashtag_analytics AS
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

-- Move extension to extensions schema if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If extensions schema doesn't exist or other error, just continue
    NULL;
END $$;