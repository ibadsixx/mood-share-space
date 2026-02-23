-- Update the post_type enum to use the new values
DROP TYPE IF EXISTS post_type_new CASCADE;
CREATE TYPE post_type_new AS ENUM ('normal_post', 'profile_picture_update', 'cover_photo_update', 'shared_post');

-- Update the posts table to use the new enum, mapping old values to new ones
ALTER TABLE posts ALTER COLUMN type DROP DEFAULT;
UPDATE posts SET type = 
  CASE 
    WHEN type::text = 'text' OR type::text = 'image' OR type::text = 'video' OR type::text = 'reel' OR type::text = 'status' THEN 'normal_post'
    WHEN type::text = 'profile_pic_change' THEN 'profile_picture_update'
    WHEN type::text = 'cover_pic_change' THEN 'cover_photo_update'
    WHEN type::text = 'shared_post' THEN 'shared_post'
    ELSE 'normal_post'
  END::post_type_new::text;

-- Drop the old enum and rename the new one
DROP TYPE post_type CASCADE;
ALTER TYPE post_type_new RENAME TO post_type;

-- Re-add the column with the new type and default
ALTER TABLE posts ALTER COLUMN type TYPE post_type USING type::text::post_type;
ALTER TABLE posts ALTER COLUMN type SET DEFAULT 'normal_post';