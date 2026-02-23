-- Create user_activity table for tracking user activities
CREATE TABLE public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Create policies for user activity
CREATE POLICY "Users can view their own activities" 
ON public.user_activity 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activities" 
ON public.user_activity 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance on user_id and created_at
CREATE INDEX idx_user_activity_user_id_created_at ON public.user_activity(user_id, created_at DESC);

-- Create index for activity type queries
CREATE INDEX idx_user_activity_type ON public.user_activity(type);