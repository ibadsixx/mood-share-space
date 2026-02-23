-- Create reel_preference_signals table for "See less" functionality
CREATE TABLE public.reel_preference_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_user_id UUID,
  target_page_id UUID,
  reel_id UUID NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type = 'see_less'),
  weight INTEGER DEFAULT -3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, target_user_id)
);

-- Enable RLS
ALTER TABLE public.reel_preference_signals ENABLE ROW LEVEL SECURITY;

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
ON public.reel_preference_signals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.reel_preference_signals
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own preferences (for weight increase)
CREATE POLICY "Users can update their own preferences"
ON public.reel_preference_signals
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_reel_preference_user ON public.reel_preference_signals(user_id);
CREATE INDEX idx_reel_preference_target ON public.reel_preference_signals(target_user_id);