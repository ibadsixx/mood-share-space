-- Create prerequisite tables if they don't yet exist
CREATE TABLE IF NOT EXISTS public.encryption_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  verified_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'verified',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_key_fingerprint TEXT,
  verified_user_id UUID
);

CREATE INDEX IF NOT EXISTS idx_encryption_verifications_conversation
  ON public.encryption_verifications(conversation_id, verified_at DESC);

CREATE TABLE IF NOT EXISTS public.user_encryption_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL,
  device_info TEXT NOT NULL DEFAULT 'Unknown browser',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ecdh_public_key TEXT,
  ecdh_key_fingerprint TEXT,
  UNIQUE (user_id, key_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_user_id
  ON public.user_encryption_keys(user_id);

-- Add encrypted content columns to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS encrypted_content TEXT,
  ADD COLUMN IF NOT EXISTS encryption_iv TEXT;

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

-- Update upsert_encryption_key to accept optional ECDH key params
CREATE OR REPLACE FUNCTION public.upsert_encryption_key(
  p_public_key TEXT,
  p_key_fingerprint TEXT,
  p_device_info TEXT DEFAULT NULL,
  p_ecdh_public_key TEXT DEFAULT NULL,
  p_ecdh_key_fingerprint TEXT DEFAULT NULL
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

  INSERT INTO public.user_encryption_keys
    (user_id, public_key, key_fingerprint, device_info, ecdh_public_key, ecdh_key_fingerprint)
  VALUES
    (auth.uid(), p_public_key, p_key_fingerprint, v_device, p_ecdh_public_key, p_ecdh_key_fingerprint)
  ON CONFLICT (user_id, key_fingerprint)
  DO UPDATE SET
    last_seen_at = NOW(),
    device_info = v_device,
    ecdh_public_key = COALESCE(p_ecdh_public_key, user_encryption_keys.ecdh_public_key),
    ecdh_key_fingerprint = COALESCE(p_ecdh_key_fingerprint, user_encryption_keys.ecdh_key_fingerprint)
  RETURNING id INTO v_key_id;

  RETURN json_build_object(
    'success', true,
    'key_id', v_key_id
  );
END;
$$;

-- RPC: verify_conversation_encryption — verify a specific key fingerprint
CREATE OR REPLACE FUNCTION public.verify_conversation_encryption(
  p_conversation_id UUID,
  p_key_fingerprint TEXT DEFAULT NULL,
  p_verified_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_now TIMESTAMPTZ;
BEGIN
  v_now := NOW();

  INSERT INTO public.encryption_verifications
    (conversation_id, verified_by, status, verified_at, verified_key_fingerprint, verified_user_id)
  VALUES
    (p_conversation_id, auth.uid(), 'verified', v_now, p_key_fingerprint, p_verified_user_id)
  RETURNING id INTO v_id;

  RETURN json_build_object(
    'success', true,
    'verification_id', v_id,
    'verified_at', v_now
  );
END;
$$;

-- Update get_encryption_details to include ECDH public keys
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
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
  ) THEN
    RETURN NULL;
  END IF;

  SELECT row_to_json(ev.*) INTO v_last_verification
  FROM (
    SELECT ev.verified_at, ev.status, ev.verified_by, p.display_name AS verified_by_name, ev.verified_key_fingerprint, ev.verified_user_id
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
            'key_id', k.id,
            'ecdh_public_key', k.ecdh_public_key,
            'ecdh_key_fingerprint', k.ecdh_key_fingerprint
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
