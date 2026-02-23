-- Add missing foreign key constraints from friends table to profiles table
-- These are critical for the useFriends hook to work with nested selects

ALTER TABLE public.friends
  ADD CONSTRAINT friends_requester_id_fkey 
  FOREIGN KEY (requester_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.friends
  ADD CONSTRAINT friends_receiver_id_fkey 
  FOREIGN KEY (receiver_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Add helpful comment
COMMENT ON CONSTRAINT friends_requester_id_fkey ON public.friends IS 
  'Links friend request sender to their profile';
COMMENT ON CONSTRAINT friends_receiver_id_fkey ON public.friends IS 
  'Links friend request receiver to their profile';