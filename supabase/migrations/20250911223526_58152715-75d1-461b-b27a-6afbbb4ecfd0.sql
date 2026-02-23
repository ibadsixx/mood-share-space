-- Create life_events table with proper structure and constraints
CREATE TABLE public.life_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  extra_info TEXT,
  visibility TEXT NOT NULL DEFAULT 'friends'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Add constraint for valid categories
  CONSTRAINT valid_category CHECK (category IN (
    'Work & Education',
    'Family & Relationships', 
    'Travel & Living',
    'Health & Wellness',
    'Milestones & Achievements'
  )),
  
  -- Add constraint for valid visibility values
  CONSTRAINT valid_visibility CHECK (visibility IN ('public', 'friends', 'private'))
);

-- Enable Row Level Security
ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view life events based on visibility and friendship"
ON public.life_events 
FOR SELECT 
USING (
  CASE
    -- User can always see their own events
    WHEN user_id = auth.uid() THEN true
    -- Public events are visible to everyone
    WHEN visibility = 'public' THEN true
    -- Private events only visible to owner
    WHEN visibility = 'private' THEN false
    -- Friends events visible to friends
    WHEN visibility = 'friends' THEN public.is_friend(auth.uid(), user_id)
    ELSE false
  END
);

CREATE POLICY "Users can create their own life events"
ON public.life_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own life events"
ON public.life_events 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own life events"
ON public.life_events 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_life_events_updated_at
BEFORE UPDATE ON public.life_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();