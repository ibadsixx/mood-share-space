-- user_encryption_keys: stores per-device public keys for real E2EE key verification
CREATE TABLE IF NOT EXISTS public.user_encryption_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL,
  device_info TEXT NOT NULL DEFAULT 'Unknown browser',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, key_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_user_id
  ON public.user_encryption_keys(user_id);

-- RPC: get_my_encryption_keys — returns all keys for the current user
CREATE OR REPLACE FUNCTION public.get_my_encryption_keys()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_keys JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', k.id,
      'public_key', k.public_key,
      'key_fingerprint', k.key_fingerprint,
      'device_info', k.device_info,
      'created_at', k.created_at,
      'last_seen_at', k.last_seen_at
    )
    ORDER BY k.last_seen_at DESC
  ) INTO v_keys
  FROM public.user_encryption_keys k
  WHERE k.user_id = auth.uid();

  RETURN COALESCE(v_keys, '[]'::json);
END;
$$;

-- RPC: upsert_encryption_key — add or refresh a key for the current user's device
CREATE OR REPLACE FUNCTION public.upsert_encryption_key(
  p_public_key TEXT,
  p_key_fingerprint TEXT,
  p_device_info TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_id UUID;
  v_device TEXT;
BEGIN
  v_device := COALESCE(p_device_info, 'Unknown browser');

  INSERT INTO public.user_encryption_keys (user_id, public_key, key_fingerprint, device_info)
  VALUES (auth.uid(), p_public_key, p_key_fingerprint, v_device)
  ON CONFLICT (user_id, key_fingerprint)
  DO UPDATE SET last_seen_at = NOW(), device_info = v_device
  RETURNING id INTO v_key_id;

  RETURN json_build_object(
    'success', true,
    'key_id', v_key_id
  );
END;
$$;

-- Recreate get_encryption_details to return real key fingerprints instead of hardcoded ones
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
  -- Explicit membership check: only return data if caller is a participant
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
  ) THEN
    RETURN NULL;
  END IF;

  SELECT row_to_json(ev.*) INTO v_last_verification
  FROM (
    SELECT ev.verified_at, ev.status, ev.verified_by, p.display_name AS verified_by_name
    FROM public.encryption_verifications ev
    JOIN public.profiles p ON p.id = ev.verified_by
    WHERE ev.conversation_id = p_conversation_id
    ORDER BY ev.verified_at DESC
    LIMIT 1
  ) ev;

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
            'browser', k.device_info,
            'key_fingerprint', k.key_fingerprint,
            'key_id', k.id
          )
          ORDER BY k.last_seen_at DESC
        ) FILTER (WHERE k.id IS NOT NULL),
        '[]'::json
      ) AS devices
    FROM public.conversation_participants cp
    JOIN public.profiles pr ON pr.id = cp.user_id
    LEFT JOIN public.user_encryption_keys k ON k.user_id = cp.user_id
    WHERE cp.conversation_id = p_conversation_id
    GROUP BY cp.user_id, pr.display_name, pr.profile_pic, pr.username
  ) p_agg;

  RETURN json_build_object(
    'last_verification', v_last_verification,
    'participants', COALESCE(v_participants, '[]'::json)
  );
END;
$$;
