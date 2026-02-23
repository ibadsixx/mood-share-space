-- Create friends table for friendship system
CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);

-- Enable Row Level Security
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Create policies for friends table
CREATE POLICY "Friends are viewable by involved users" 
ON public.friends 
FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests" 
ON public.friends 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friend requests they received" 
ON public.friends 
FOR UPDATE 
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own friend requests" 
ON public.friends 
FOR DELETE 
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Create profile_details table for extended about information
CREATE TABLE public.profile_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  section TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, section, field_name)
);

-- Enable Row Level Security
ALTER TABLE public.profile_details ENABLE ROW LEVEL SECURITY;

-- Create policies for profile_details table
CREATE POLICY "Profile details are viewable by everyone" 
ON public.profile_details 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own profile details" 
ON public.profile_details 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = profile_details.profile_id 
    AND profiles.id = auth.uid()
  )
);

-- Create trigger for updating updated_at on friends table
CREATE TRIGGER update_friends_updated_at
BEFORE UPDATE ON public.friends
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating updated_at on profile_details table
CREATE TRIGGER update_profile_details_updated_at
BEFORE UPDATE ON public.profile_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();