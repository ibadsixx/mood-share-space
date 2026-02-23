-- Create call history table to store voice/video call records
CREATE TABLE public.call_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'declined', 'busy', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_call_history_caller_id ON public.call_history(caller_id);
CREATE INDEX idx_call_history_receiver_id ON public.call_history(receiver_id);
CREATE INDEX idx_call_history_started_at ON public.call_history(started_at DESC);

-- Enable Row Level Security
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own call history (as caller or receiver)
CREATE POLICY "Users can view their own call history"
ON public.call_history
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Users can insert call records where they are the caller
CREATE POLICY "Users can create call records as caller"
ON public.call_history
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

-- Users can update call records they are part of
CREATE POLICY "Users can update their call records"
ON public.call_history
FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Create function to log a completed call
CREATE OR REPLACE FUNCTION public.log_call(
  p_caller_id UUID,
  p_receiver_id UUID,
  p_call_type TEXT,
  p_status TEXT,
  p_duration_seconds INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call_id UUID;
BEGIN
  INSERT INTO public.call_history (
    caller_id,
    receiver_id,
    call_type,
    status,
    duration_seconds,
    ended_at
  ) VALUES (
    p_caller_id,
    p_receiver_id,
    p_call_type,
    p_status,
    p_duration_seconds,
    CASE WHEN p_status = 'completed' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_call_id;
  
  RETURN v_call_id;
END;
$$;

-- Create function to get call history for a user
CREATE OR REPLACE FUNCTION public.get_call_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  other_user_id UUID,
  other_user_username TEXT,
  other_user_display_name TEXT,
  other_user_profile_pic TEXT,
  call_type TEXT,
  status TEXT,
  is_outgoing BOOLEAN,
  started_at TIMESTAMPTZ,
  duration_seconds INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ch.id,
    CASE WHEN ch.caller_id = p_user_id THEN ch.receiver_id ELSE ch.caller_id END as other_user_id,
    p.username as other_user_username,
    p.display_name as other_user_display_name,
    p.profile_pic as other_user_profile_pic,
    ch.call_type,
    ch.status,
    (ch.caller_id = p_user_id) as is_outgoing,
    ch.started_at,
    ch.duration_seconds
  FROM public.call_history ch
  JOIN public.profiles p ON p.id = CASE 
    WHEN ch.caller_id = p_user_id THEN ch.receiver_id 
    ELSE ch.caller_id 
  END
  WHERE ch.caller_id = p_user_id OR ch.receiver_id = p_user_id
  ORDER BY ch.started_at DESC
  LIMIT p_limit;
END;
$$;