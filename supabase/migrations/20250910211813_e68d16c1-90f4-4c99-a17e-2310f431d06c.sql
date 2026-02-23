-- Add privacy/visibility columns to profiles table for work and education fields
ALTER TABLE public.profiles 
ADD COLUMN function_visibility text DEFAULT 'public',
ADD COLUMN company_visibility text DEFAULT 'public',
ADD COLUMN college_visibility text DEFAULT 'public',
ADD COLUMN high_school_visibility text DEFAULT 'public';

-- Add check constraints to ensure valid visibility values
ALTER TABLE public.profiles 
ADD CONSTRAINT function_visibility_check 
CHECK (function_visibility IN ('public', 'friends', 'only_me', 'custom')),
ADD CONSTRAINT company_visibility_check 
CHECK (company_visibility IN ('public', 'friends', 'only_me', 'custom')),
ADD CONSTRAINT college_visibility_check 
CHECK (college_visibility IN ('public', 'friends', 'only_me', 'custom')),
ADD CONSTRAINT high_school_visibility_check 
CHECK (high_school_visibility IN ('public', 'friends', 'only_me', 'custom'));