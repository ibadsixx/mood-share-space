-- Migration: Move video data from post_media to posts table
-- Step 1: Update posts to have media_url and media_type from post_media

UPDATE posts p
SET 
  media_url = pm.file_url,
  media_type = pm.file_type
FROM post_media pm
WHERE pm.post_id = p.id
  AND pm.file_type = 'video'
  AND (p.media_url IS NULL OR p.media_url = '');

-- Step 2: For any remaining image post_media, update those too
UPDATE posts p
SET 
  media_url = pm.file_url,
  media_type = pm.file_type
FROM post_media pm
WHERE pm.post_id = p.id
  AND pm.file_type = 'image'
  AND (p.media_url IS NULL OR p.media_url = '');

-- Step 3: Drop the post_media table (no longer needed)
DROP TABLE IF EXISTS post_media CASCADE;