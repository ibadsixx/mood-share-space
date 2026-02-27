
-- Add first_name, middle_name, last_name columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS middle_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS name_changed_at TIMESTAMPTZ;
