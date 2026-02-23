-- Fix any missing constraints and improve message system

-- First, let's check if we have proper foreign key constraints
DO $$ 
BEGIN
    -- Add foreign key constraints if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'messages' AND constraint_name = 'messages_sender_id_fkey'
    ) THEN
        ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'messages' AND constraint_name = 'messages_receiver_id_fkey'
    ) THEN
        ALTER TABLE public.messages ADD CONSTRAINT messages_receiver_id_fkey 
        FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'message_requests' AND constraint_name = 'message_requests_sender_id_fkey'
    ) THEN
        ALTER TABLE public.message_requests ADD CONSTRAINT message_requests_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'message_requests' AND constraint_name = 'message_requests_receiver_id_fkey'
    ) THEN
        ALTER TABLE public.message_requests ADD CONSTRAINT message_requests_receiver_id_fkey 
        FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure unique constraint on message requests (one pending request per sender-receiver pair)
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_message_request 
ON public.message_requests (sender_id, receiver_id) 
WHERE status = 'pending';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver 
ON public.messages (sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_requests_receiver_status 
ON public.message_requests (receiver_id, status, created_at DESC);

-- Create a function to check if users are friends
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update RLS policies for better message handling

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;

-- Create comprehensive RLS policies for messages
CREATE POLICY "Users can send direct messages to friends or via conversation" 
ON public.messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id 
    AND (
        -- Can send if they're friends
        are_users_friends(sender_id, receiver_id)
        OR 
        -- Can send if part of the conversation
        (conversation_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id 
            AND cp.user_id = auth.uid()
        ))
    )
    AND NOT is_blocked(sender_id, receiver_id)
);

CREATE POLICY "Users can view their messages" 
ON public.messages FOR SELECT 
USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND NOT is_blocked(sender_id, receiver_id)
);

-- Update message requests policies
DROP POLICY IF EXISTS "Users can send message requests" ON public.message_requests;

CREATE POLICY "Users can send message requests to non-friends" 
ON public.message_requests FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id 
    AND NOT are_users_friends(sender_id, receiver_id)
    AND NOT is_blocked(sender_id, receiver_id)
);