-- Add key-specific verification fields to encryption_verifications
ALTER TABLE public.encryption_verifications
  ADD COLUMN IF NOT EXISTS verified_key_fingerprint TEXT;

ALTER TABLE public.encryption_verifications
  ADD COLUMN IF NOT EXISTS verified_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Recreate verify_conversation_encryption to accept the specific key fingerprint being verified
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
  v_verification_id UUID;
BEGIN
  INSERT INTO public.encryption_verifications
    (conversation_id, verified_by, status, verified_key_fingerprint, verified_user_id)
  VALUES (p_conversation_id, auth.uid(), 'verified', p_key_fingerprint, p_verified_user_id)
  RETURNING id INTO v_verification_id;

  RETURN json_build_object(
    'success', true,
    'verification_id', v_verification_id,
    'verified_at', NOW()
  );
END;
$$;
