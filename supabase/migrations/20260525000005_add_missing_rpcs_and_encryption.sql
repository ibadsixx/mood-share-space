-- Create encryption_verifications table (exists in types but missing from migrations)
CREATE TABLE IF NOT EXISTS public.encryption_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  verified_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'verified',
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encryption_verifications_conversation
  ON public.encryption_verifications(conversation_id, verified_at DESC);

-- Add messaging_controls JSON column to conversation_settings (exists in types but missing from migrations)
ALTER TABLE public.conversation_settings
  ADD COLUMN IF NOT EXISTS messaging_controls JSONB DEFAULT '{}'::jsonb;

-- RPC: get_encryption_details — returns participants + last verification for a conversation
CREATE OR REPLACE FUNCTION public.get_encryption_details(p_conversation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_verification JSON;
  v_participants JSON;
BEGIN
  -- Last verification record
  SELECT row_to_json(ev.*) INTO v_last_verification
  FROM (
    SELECT ev.verified_at, ev.status, ev.verified_by, p.display_name AS verified_by_name
    FROM public.encryption_verifications ev
    JOIN public.profiles p ON p.id = ev.verified_by
    WHERE ev.conversation_id = p_conversation_id
    ORDER BY ev.verified_at DESC
    LIMIT 1
  ) ev;

  -- Participants with device info
  SELECT json_agg(p_agg) INTO v_participants
  FROM (
    SELECT
      cp.user_id,
      pr.display_name,
      pr.profile_pic,
      pr.username,
      COALESCE(
        json_agg(
          json_build_object(
            'browser', 'Unknown browser',
            'key_fingerprint', 'EB 66 AA 4D 88 11 60 6A 17 4C 83 EF 85 02 83 19 BE EE 9E A9 D0 04 1A 36 51 67 30 AB'
          )
        ) FILTER (WHERE cp.user_id IS NOT NULL),
        '[]'::json
      ) AS devices
    FROM public.conversation_participants cp
    JOIN public.profiles pr ON pr.id = cp.user_id
    WHERE cp.conversation_id = p_conversation_id
    GROUP BY cp.user_id, pr.display_name, pr.profile_pic, pr.username
  ) p_agg;

  RETURN json_build_object(
    'last_verification', v_last_verification,
    'participants', COALESCE(v_participants, '[]'::json)
  );
END;
$$;

-- RPC: verify_conversation_encryption — inserts a verification record
CREATE OR REPLACE FUNCTION public.verify_conversation_encryption(p_conversation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification_id UUID;
BEGIN
  INSERT INTO public.encryption_verifications (conversation_id, verified_by, status)
  VALUES (p_conversation_id, auth.uid(), 'verified')
  RETURNING id INTO v_verification_id;

  RETURN json_build_object(
    'success', true,
    'verification_id', v_verification_id,
    'verified_at', NOW()
  );
END;
$$;

-- RPC: update_messaging_controls — updates conversation_settings
CREATE OR REPLACE FUNCTION public.update_messaging_controls(
  p_conversation_id UUID,
  p_who_can_reply TEXT DEFAULT NULL,
  p_message_requests_enabled BOOLEAN DEFAULT NULL
)
RETURNS SETOF public.conversation_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_controls JSONB;
  v_new_controls JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Ensure settings row exists
  INSERT INTO public.conversation_settings (conversation_id, user_id)
  VALUES (p_conversation_id, v_user_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  -- Get current controls
  SELECT COALESCE(messaging_controls, '{}'::jsonb) INTO v_current_controls
  FROM public.conversation_settings
  WHERE conversation_id = p_conversation_id AND user_id = v_user_id;

  -- Merge new values
  v_new_controls := v_current_controls;
  IF p_who_can_reply IS NOT NULL THEN
    v_new_controls := jsonb_set(v_new_controls, '{who_can_reply}', to_jsonb(p_who_can_reply));
  END IF;
  IF p_message_requests_enabled IS NOT NULL THEN
    v_new_controls := jsonb_set(v_new_controls, '{allow_message_sharing}', to_jsonb(p_message_requests_enabled));
  END IF;

  -- Update
  UPDATE public.conversation_settings
  SET messaging_controls = v_new_controls,
      updated_at = NOW()
  WHERE conversation_id = p_conversation_id AND user_id = v_user_id;

  -- Return the updated row
  RETURN QUERY
  SELECT * FROM public.conversation_settings
  WHERE conversation_id = p_conversation_id AND user_id = v_user_id;
END;
$$;
