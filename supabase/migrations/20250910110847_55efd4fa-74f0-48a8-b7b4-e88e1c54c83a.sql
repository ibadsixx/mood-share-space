-- Create colleges table
CREATE TABLE public.colleges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Colleges are viewable by everyone" 
ON public.colleges 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create colleges" 
ON public.colleges 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);