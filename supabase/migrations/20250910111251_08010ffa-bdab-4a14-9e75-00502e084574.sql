-- Add college_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN college_id UUID REFERENCES public.colleges(id);