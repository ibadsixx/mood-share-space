-- Remove conflicting check constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS college_visibility_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS company_visibility_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS function_visibility_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS high_school_visibility_check;

-- Update the handle_new_user function to set proper default visibility values
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    username, 
    display_name,
    email_visibility,
    phone_visibility,
    websites_visibility,
    gender_visibility,
    pronouns_visibility,
    birth_date_visibility,
    birth_year_visibility,
    college_visibility,
    company_visibility,
    function_visibility,
    high_school_visibility
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'public',
    'public',
    'public',
    'public',
    'public',
    'public',
    'public',
    'public',
    'public',
    'public',
    'public'
  );
  RETURN new;
END;
$$;