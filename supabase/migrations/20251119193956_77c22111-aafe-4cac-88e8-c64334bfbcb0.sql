-- Fix search_path for security
DROP FUNCTION IF EXISTS update_music_trending_status();

CREATE OR REPLACE FUNCTION update_music_trending_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark songs as trending if usage_count >= 10
  UPDATE public.music_library
  SET is_trending = true
  WHERE usage_count >= 10 AND is_trending = false;
  
  -- Remove trending status if usage_count < 10
  UPDATE public.music_library
  SET is_trending = false
  WHERE usage_count < 10 AND is_trending = true;
END;
$$;

-- Drop old trigger function and recreate with search_path
DROP TRIGGER IF EXISTS music_library_updated_at ON public.music_library;
DROP FUNCTION IF EXISTS update_music_updated_at();

CREATE OR REPLACE FUNCTION update_music_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER music_library_updated_at
BEFORE UPDATE ON public.music_library
FOR EACH ROW
EXECUTE FUNCTION update_music_updated_at();