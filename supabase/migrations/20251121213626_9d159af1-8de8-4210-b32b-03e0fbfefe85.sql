-- Create a SECURITY DEFINER function to increment music usage count
-- This allows ANY authenticated user to increment usage, not just the creator
CREATE OR REPLACE FUNCTION public.increment_music_usage(p_music_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Increment usage count and update last_used_at
  UPDATE public.music_library
  SET 
    usage_count = usage_count + 1,
    updated_at = now()
  WHERE id = p_music_id;

  -- Update trending status
  PERFORM update_music_trending_status();

  -- Return the updated row as JSON
  SELECT row_to_json(m.*) INTO v_result
  FROM public.music_library m
  WHERE m.id = p_music_id;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_music_usage(uuid) TO authenticated;

COMMENT ON FUNCTION public.increment_music_usage IS 'Safely increments usage_count for any music track, callable by any authenticated user';