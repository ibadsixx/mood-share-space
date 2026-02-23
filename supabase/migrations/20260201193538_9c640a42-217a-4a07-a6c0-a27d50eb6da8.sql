-- Persist per-conversation chat theme selection
ALTER TABLE public.conversation_settings
ADD COLUMN IF NOT EXISTS chat_theme text NOT NULL DEFAULT 'default';

-- Update settings upsert RPC to include chat_theme
CREATE OR REPLACE FUNCTION public.update_conversation_settings(
  p_conversation_id uuid,
  p_is_muted boolean DEFAULT NULL::boolean,
  p_vanishing_messages_enabled boolean DEFAULT NULL::boolean,
  p_vanishing_messages_duration integer DEFAULT NULL::integer,
  p_read_receipts_enabled boolean DEFAULT NULL::boolean,
  p_chat_theme text DEFAULT NULL::text
)
RETURNS conversation_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_settings public.conversation_settings;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Upsert settings
  INSERT INTO public.conversation_settings (
    conversation_id,
    user_id,
    is_muted,
    vanishing_messages_enabled,
    vanishing_messages_duration,
    read_receipts_enabled,
    chat_theme
  )
  VALUES (
    p_conversation_id,
    v_user_id,
    COALESCE(p_is_muted, false),
    COALESCE(p_vanishing_messages_enabled, false),
    COALESCE(p_vanishing_messages_duration, 86400),
    COALESCE(p_read_receipts_enabled, true),
    COALESCE(p_chat_theme, 'default')
  )
  ON CONFLICT (conversation_id, user_id) DO UPDATE SET
    is_muted = COALESCE(p_is_muted, conversation_settings.is_muted),
    vanishing_messages_enabled = COALESCE(p_vanishing_messages_enabled, conversation_settings.vanishing_messages_enabled),
    vanishing_messages_duration = COALESCE(p_vanishing_messages_duration, conversation_settings.vanishing_messages_duration),
    read_receipts_enabled = COALESCE(p_read_receipts_enabled, conversation_settings.read_receipts_enabled),
    chat_theme = COALESCE(p_chat_theme, conversation_settings.chat_theme),
    updated_at = now()
  RETURNING * INTO v_settings;

  RETURN v_settings;
END;
$function$;