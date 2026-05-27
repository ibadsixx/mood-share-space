-- Create restricted_users table for Instagram-style restriction
CREATE TABLE IF NOT EXISTS public.restricted_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restricted_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, restricted_user_id)
);

-- Enable RLS
ALTER TABLE public.restricted_users ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own restrictions"
ON public.restricted_users FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can restrict others"
ON public.restricted_users FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own restrictions"
ON public.restricted_users FOR DELETE
USING (auth.uid() = user_id);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_restricted_users_user_id ON public.restricted_users(user_id);
CREATE INDEX IF NOT EXISTS idx_restricted_users_restricted_user_id ON public.restricted_users(restricted_user_id);
