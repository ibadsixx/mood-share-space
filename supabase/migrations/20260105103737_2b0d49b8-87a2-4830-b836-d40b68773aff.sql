-- Add constraint to prevent saving both content_id and profile_id together
-- "See less" uses content_id only (profile_id = NULL)
-- "Hide profile" uses profile_id only (content_id = NULL)

ALTER TABLE public.hidden_content
ADD CONSTRAINT hidden_content_exclusive_check
CHECK (
  (content_id IS NOT NULL AND profile_id IS NULL) OR
  (content_id IS NULL AND profile_id IS NOT NULL)
);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT hidden_content_exclusive_check ON public.hidden_content IS 
'Ensures either content_id OR profile_id is set, but never both. content_id = See less (single item), profile_id = Hide profile (all from creator)';