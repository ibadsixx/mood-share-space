-- Create technical_feedback table for "Something isn't working" reports
CREATE TABLE public.technical_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  post_id UUID NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('reel', 'video', 'normal_post')),
  post_url TEXT NOT NULL,
  post_owner_id UUID NOT NULL,
  affected_area TEXT,
  user_message TEXT,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technical_feedback ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own feedback (reporter_id must match auth.uid())
CREATE POLICY "Users can submit their own feedback"
ON public.technical_feedback
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own submitted feedback
CREATE POLICY "Users can view their own feedback"
ON public.technical_feedback
FOR SELECT
USING (auth.uid() = reporter_id);

-- Create index for faster queries
CREATE INDEX idx_technical_feedback_post_id ON public.technical_feedback(post_id);
CREATE INDEX idx_technical_feedback_status ON public.technical_feedback(status);
CREATE INDEX idx_technical_feedback_reporter ON public.technical_feedback(reporter_id);