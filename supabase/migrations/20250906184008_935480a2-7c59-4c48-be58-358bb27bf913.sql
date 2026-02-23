-- Create new enum type with the desired values
CREATE TYPE post_type_new AS ENUM ('normal_post', 'profile_picture_update', 'cover_photo_update', 'shared_post');

-- Add a temporary column with the new type
ALTER TABLE posts ADD COLUMN type_new post_type_new DEFAULT 'normal_post';

-- Map old values to new values
UPDATE posts SET type_new = 
  CASE 
    WHEN type::text = 'text' OR type::text = 'image' OR type::text = 'video' OR type::text = 'reel' OR type::text = 'status' THEN 'normal_post'::post_type_new
    WHEN type::text = 'profile_pic_change' THEN 'profile_picture_update'::post_type_new
    WHEN type::text = 'cover_pic_change' THEN 'cover_photo_update'::post_type_new
    WHEN type::text = 'shared_post' THEN 'shared_post'::post_type_new
    ELSE 'normal_post'::post_type_new
  END;

-- Drop the old column
ALTER TABLE posts DROP COLUMN type;

-- Rename the new column to the original name
ALTER TABLE posts RENAME COLUMN type_new TO type;

-- Drop the old enum type
DROP TYPE IF EXISTS post_type CASCADE;