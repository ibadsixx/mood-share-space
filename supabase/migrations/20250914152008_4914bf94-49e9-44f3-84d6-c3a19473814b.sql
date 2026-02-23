-- Find and fix the remaining function with search path issue
-- Let's check all functions and fix any remaining ones

-- Fix the set_message_request_category function that might exist
CREATE OR REPLACE FUNCTION public.set_message_request_category()
RETURNS trigger AS $$
BEGIN
    IF NEW.category IS NULL OR NEW.category = 'spam' THEN
        NEW.category := public.determine_request_category(NEW.sender_id, NEW.receiver_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix the determine_request_category function
CREATE OR REPLACE FUNCTION public.determine_request_category(sender_id uuid, receiver_id uuid)
RETURNS message_request_category AS $$
    SELECT CASE 
        WHEN public.get_mutual_friends_count(sender_id, receiver_id) > 0 THEN 'you_may_know'::message_request_category
        ELSE 'spam'::message_request_category
    END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;