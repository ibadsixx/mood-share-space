-- Update the post_type enum to match the new requirements
-- First, add the new shared_post type
ALTER TYPE post_type ADD VALUE 'shared_post';

-- Add a status type for normal posts  
ALTER TYPE post_type ADD VALUE 'status';

-- Note: We'll keep the existing profile_pic_change and cover_pic_change values
-- but will map them to the new naming convention in the frontend