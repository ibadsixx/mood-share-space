-- Create other_names table for profile additional names
CREATE TABLE public.other_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('nickname', 'birth_name', 'married_name', 'other')),
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  show_at_top BOOLEAN NOT NULL DEFAULT false,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.other_names ENABLE ROW LEVEL SECURITY;

-- Create policies for other_names
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
    WHEN visibility = 'friends' THEN is_friend(auth.uid(), user_id)
    ELSE false
  END
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_other_names_updated_at
BEFORE UPDATE ON public.other_names
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.other_names REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.other_names;