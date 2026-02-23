-- Create reel_reports table for reporting videos
CREATE TABLE public.reel_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL,
  reported_by UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bug_reports table for feedback
CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_preferences table for storing user preferences
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  see_less_reels BOOLEAN DEFAULT false,
  see_less_reel_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.reel_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for reel_reports
CREATE POLICY "Users can create reel reports"
ON public.reel_reports
FOR INSERT
WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own reports"
ON public.reel_reports
FOR SELECT
USING (auth.uid() = reported_by);

-- RLS policies for bug_reports
CREATE POLICY "Users can create bug reports"
ON public.bug_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bug reports"
ON public.bug_reports
FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for user_preferences
CREATE POLICY "Users can manage their own preferences"
ON public.user_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updating user_preferences updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_reel_reports_reel_id ON public.reel_reports(reel_id);
CREATE INDEX idx_reel_reports_reported_by ON public.reel_reports(reported_by);
CREATE INDEX idx_bug_reports_user_id ON public.bug_reports(user_id);
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);