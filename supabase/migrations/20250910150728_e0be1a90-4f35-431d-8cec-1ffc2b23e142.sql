-- Create high_schools table
CREATE TABLE public.high_schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.high_schools ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "High schools are viewable by everyone" 
ON public.high_schools 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create high schools" 
ON public.high_schools 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

-- Add high_school_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN high_school_id UUID REFERENCES high_schools(id);

-- Insert initial high schools
INSERT INTO high_schools (name) VALUES
('Thénia High School - Algeria'),
('Abdelkader High School - Oran'),
('Bouamama High School - Constantine'),
('Ibn Khaldoun High School - Sétif'),
('Houari Boumediene High School - Algiers');