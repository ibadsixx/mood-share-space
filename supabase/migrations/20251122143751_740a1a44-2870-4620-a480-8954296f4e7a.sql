-- Fix increment_music_usage to return proper data and handle errors
CREATE OR REPLACE FUNCTION public.increment_music_usage(p_music_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_rows_updated integer;
BEGIN
  -- Log the input
  RAISE NOTICE 'increment_music_usage called with id: %', p_music_id;
  
  -- Increment usage count and update timestamp
  UPDATE public.music_library
  SET 
    usage_count = usage_count + 1,
    updated_at = now()
  WHERE id = p_music_id;
  
  -- Check if any rows were updated
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Music entry with id % not found', p_music_id;
  END IF;
  
  RAISE NOTICE 'Updated % rows', v_rows_updated;

  -- Update trending status
  PERFORM update_music_trending_status();

  -- Return the updated row as JSON (should always exist now)
  SELECT row_to_json(m.*) INTO v_result
  FROM public.music_library m
  WHERE m.id = p_music_id;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to fetch updated music entry with id %', p_music_id;
  END IF;
  
  RAISE NOTICE 'Returning result: %', v_result;

  RETURN v_result;
END;
$function$;