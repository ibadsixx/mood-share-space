-- Create content_preferences table for soft preference signals
CREATE TABLE public.content_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  preference TEXT NOT NULL,
  weight INTEGER DEFAULT -3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, owner_id, content_type, preference)
);

-- Enable RLS
ALTER TABLE public.content_preferences ENABLE ROW LEVEL SECURITY;

-- Users can insert their own preferences
CREATE POLICY "Users can insert preferences"
ON public.content_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own preferences
CREATE POLICY "Users can view preferences"
ON public.content_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update preferences"
ON public.content_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Indexes for feed ranking queries
CREATE INDEX idx_content_pref_user ON public.content_preferences(user_id);
CREATE INDEX idx_content_pref_owner ON public.content_preferences(owner_id);
CREATE INDEX idx_content_pref_type ON public.content_preferences(content_type, preference);