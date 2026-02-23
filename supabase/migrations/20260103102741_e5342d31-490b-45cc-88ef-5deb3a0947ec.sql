-- Create hidden_reels table for per-user reel hiding
CREATE TABLE public.hidden_reels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL,
  reel_owner_id UUID NOT NULL,
  hidden_by_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate hides
CREATE UNIQUE INDEX hidden_reels_unique ON public.hidden_reels (reel_id, hidden_by_id);

-- Create index for efficient feed filtering
CREATE INDEX hidden_reels_hidden_by_idx ON public.hidden_reels (hidden_by_id);

-- Enable Row Level Security
ALTER TABLE public.hidden_reels ENABLE ROW LEVEL SECURITY;

-- Users can view their own hidden reels
CREATE POLICY "Users can view their own hidden reels"
ON public.hidden_reels
FOR SELECT
USING (auth.uid() = hidden_by_id);

-- Users can hide reels
CREATE POLICY "Users can hide reels"
ON public.hidden_reels
FOR INSERT
WITH CHECK (auth.uid() = hidden_by_id);

-- Users can unhide reels they hid
CREATE POLICY "Users can unhide reels"
ON public.hidden_reels
FOR DELETE
USING (auth.uid() = hidden_by_id);