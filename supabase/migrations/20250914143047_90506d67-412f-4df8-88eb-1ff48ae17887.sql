-- Create enum types for message requests
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_request_status') THEN
        CREATE TYPE message_request_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_request_category') THEN
        CREATE TYPE message_request_category AS ENUM ('you_may_know', 'spam');
    END IF;
END $$;

-- Create message_requests table
CREATE TABLE IF NOT EXISTS public.message_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status message_request_status NOT NULL DEFAULT 'pending',
    category message_request_category NOT NULL DEFAULT 'spam',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unique_sender_receiver UNIQUE(sender_id, receiver_id)
);

-- Enable RLS on message_requests
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Receiver can view their incoming requests" ON public.message_requests;
DROP POLICY IF EXISTS "Sender can view their sent requests" ON public.message_requests;
DROP POLICY IF EXISTS "Users can send message requests" ON public.message_requests;
DROP POLICY IF EXISTS "Receiver can update request status" ON public.message_requests;

-- RLS Policies for message_requests
CREATE POLICY "Receiver can view their incoming requests"
ON public.message_requests
FOR SELECT
USING (auth.uid() = receiver_id);

CREATE POLICY "Sender can view their sent requests"
ON public.message_requests
FOR SELECT
USING (auth.uid() = sender_id);

CREATE POLICY "Users can send message requests"
ON public.message_requests
FOR INSERT
WITH CHECK (
    auth.uid() = sender_id 
    AND NOT EXISTS (
        SELECT 1 FROM public.blocked_users 
        WHERE (user_id = receiver_id AND blocked_user_id = sender_id)
           OR (user_id = sender_id AND blocked_user_id = receiver_id)
    )
);

CREATE POLICY "Receiver can update request status"
ON public.message_requests
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Function to get mutual friends count
CREATE OR REPLACE FUNCTION public.get_mutual_friends_count(user_a uuid, user_b uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::integer
    FROM (
        SELECT f1.receiver_id as friend_id
        FROM friends f1
        WHERE f1.requester_id = user_a AND f1.status = 'accepted'
        UNION
        SELECT f1.requester_id as friend_id
        FROM friends f1
        WHERE f1.receiver_id = user_a AND f1.status = 'accepted'
    ) friends_a
    INNER JOIN (
        SELECT f2.receiver_id as friend_id
        FROM friends f2
        WHERE f2.requester_id = user_b AND f2.status = 'accepted'
        UNION
        SELECT f2.requester_id as friend_id
        FROM friends f2
        WHERE f2.receiver_id = user_b AND f2.status = 'accepted'
    ) friends_b ON friends_a.friend_id = friends_b.friend_id;
$$;

-- Function to determine message request category
CREATE OR REPLACE FUNCTION public.determine_request_category(sender_id uuid, receiver_id uuid)
RETURNS message_request_category
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE 
        WHEN public.get_mutual_friends_count(sender_id, receiver_id) > 0 THEN 'you_may_know'::message_request_category
        ELSE 'spam'::message_request_category
    END;
$$;

-- Trigger to automatically set category based on mutual friends
CREATE OR REPLACE FUNCTION public.set_message_request_category()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.category IS NULL OR NEW.category = 'spam' THEN
        NEW.category := public.determine_request_category(NEW.sender_id, NEW.receiver_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_message_request_category_trigger ON public.message_requests;
CREATE TRIGGER set_message_request_category_trigger
    BEFORE INSERT ON public.message_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_message_request_category();

-- Update trigger for updated_at
DROP TRIGGER IF EXISTS update_message_requests_updated_at ON public.message_requests;
CREATE TRIGGER update_message_requests_updated_at
    BEFORE UPDATE ON public.message_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();