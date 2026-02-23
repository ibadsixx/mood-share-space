-- Extend profiles table with new fields for "Details About You" section
ALTER TABLE public.profiles 
ADD COLUMN about_you text,
ADD COLUMN about_you_visibility text DEFAULT 'friends',
ADD COLUMN name_pronunciation text,
ADD COLUMN name_pronunciation_visibility text DEFAULT 'friends';

-- Create other_names table for additional names/nicknames
CREATE TABLE public.other_names (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  name text NOT NULL,
  show_at_top boolean DEFAULT false,
  visibility text DEFAULT 'friends',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on other_names table
ALTER TABLE public.other_names ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for other_names table
CREATE POLICY "Users can manage their own other names" 
ON public.other_names 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Other names are viewable based on visibility and friendship" 
ON public.other_names 
FOR SELECT 
USING (
  CASE
    WHEN user_id = auth.uid() THEN true
    WHEN visibility = 'public' THEN true
    WHEN visibility = 'private' THEN false
    WHEN visibility = 'friends' THEN public.is_friend(auth.uid(), user_id)
    ELSE false
  END
);

-- Add trigger for automatic timestamp updates on other_names
CREATE TRIGGER update_other_names_updated_at
BEFORE UPDATE ON public.other_names
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();