-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION public.are_users_friends(user_a uuid, user_b uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.friends 
        WHERE ((requester_id = user_a AND receiver_id = user_b) 
               OR (requester_id = user_b AND receiver_id = user_a))
        AND status = 'accepted'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Also fix the handle_new_user function if it exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;