-- Add duration column to stories table for proper playback control
ALTER TABLE public.stories
ADD COLUMN duration integer DEFAULT 5;

-- Add comment explaining the column
COMMENT ON COLUMN public.stories.duration IS 'Story display duration in seconds. Default 5s for images, capped at 15s for videos.';