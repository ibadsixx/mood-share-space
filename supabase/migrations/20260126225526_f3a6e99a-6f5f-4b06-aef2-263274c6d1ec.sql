-- Create conversation_settings table to store per-conversation preferences
CREATE TABLE public.conversation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  vanishing_messages_enabled BOOLEAN NOT NULL DEFAULT false,
  vanishing_messages_duration INTEGER DEFAULT 86400, -- Duration in seconds (default 24 hours)
  read_receipts_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.conversation_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversation settings
CREATE POLICY "Users can view their own conversation settings"
ON public.conversation_settings FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own conversation settings
CREATE POLICY "Users can insert their own conversation settings"
ON public.conversation_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversation settings
CREATE POLICY "Users can update their own conversation settings"
ON public.conversation_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own conversation settings
CREATE POLICY "Users can delete their own conversation settings"
ON public.conversation_settings FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_conversation_settings_updated_at
BEFORE UPDATE ON public.conversation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create RPC function to get or create conversation settings
CREATE OR REPLACE FUNCTION public.get_or_create_conversation_settings(p_conversation_id UUID)
RETURNS public.conversation_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.conversation_settings;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Try to get existing settings
  SELECT * INTO v_settings
  FROM public.conversation_settings
  WHERE conversation_id = p_conversation_id AND user_id = v_user_id;
  
  -- If not found, create default settings
  IF v_settings IS NULL THEN
    INSERT INTO public.conversation_settings (conversation_id, user_id)
    VALUES (p_conversation_id, v_user_id)
    RETURNING * INTO v_settings;
  END IF;
  
  RETURN v_settings;
END;
$$;

-- Create RPC function to update conversation settings
CREATE OR REPLACE FUNCTION public.update_conversation_settings(
  p_conversation_id UUID,
  p_is_muted BOOLEAN DEFAULT NULL,
  p_vanishing_messages_enabled BOOLEAN DEFAULT NULL,
  p_vanishing_messages_duration INTEGER DEFAULT NULL,
  p_read_receipts_enabled BOOLEAN DEFAULT NULL
)
RETURNS public.conversation_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.conversation_settings;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Upsert settings
  INSERT INTO public.conversation_settings (conversation_id, user_id, is_muted, vanishing_messages_enabled, vanishing_messages_duration, read_receipts_enabled)
  VALUES (
    p_conversation_id,
    v_user_id,
    COALESCE(p_is_muted, false),
    COALESCE(p_vanishing_messages_enabled, false),
    COALESCE(p_vanishing_messages_duration, 86400),
    COALESCE(p_read_receipts_enabled, true)
  )
  ON CONFLICT (conversation_id, user_id) DO UPDATE SET
    is_muted = COALESCE(p_is_muted, conversation_settings.is_muted),
    vanishing_messages_enabled = COALESCE(p_vanishing_messages_enabled, conversation_settings.vanishing_messages_enabled),
    vanishing_messages_duration = COALESCE(p_vanishing_messages_duration, conversation_settings.vanishing_messages_duration),
    read_receipts_enabled = COALESCE(p_read_receipts_enabled, conversation_settings.read_receipts_enabled),
    updated_at = now()
  RETURNING * INTO v_settings;
  
  RETURN v_settings;
END;
$$;

-- Create conversation_reports table for flagging conversations
CREATE TABLE public.conversation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, reporter_id)
);

-- Enable RLS
ALTER TABLE public.conversation_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
CREATE POLICY "Users can create conversation reports"
ON public.conversation_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own conversation reports"
ON public.conversation_reports FOR SELECT
USING (auth.uid() = reporter_id);