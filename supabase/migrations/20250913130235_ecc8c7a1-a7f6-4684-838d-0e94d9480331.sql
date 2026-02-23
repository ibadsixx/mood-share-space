-- Add privacy column to profiles table for default privacy setting
ALTER TABLE public.profiles 
ADD COLUMN privacy text DEFAULT 'public'::text;

-- Add a check constraint to ensure valid privacy values
ALTER TABLE public.profiles 
ADD CONSTRAINT privacy_check CHECK (privacy IN ('public', 'friends', 'only_me'));