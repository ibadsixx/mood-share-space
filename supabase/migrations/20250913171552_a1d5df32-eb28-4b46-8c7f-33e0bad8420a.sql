-- 1) Ensure friends_visibility only allows public, friends, only_me
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_friends_visibility_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_friends_visibility_check
  CHECK (friends_visibility IN ('public','friends','only_me'));

-- 2) RLS policy to view friends based on privacy
-- Allow viewing accepted friendships according to the owner's privacy setting
-- Keep existing owner visibility policies; this adds broader privacy-based access
CREATE POLICY "View friends list by privacy"
ON public.friends
FOR SELECT
USING (
  status = 'accepted' AND (
    -- Owner of the friendship row can always view
    auth.uid() = requester_id OR auth.uid() = receiver_id OR
    -- Public: anyone can view accepted friendships of a user with public friends list
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = friends.requester_id OR p.id = friends.receiver_id)
        AND p.friends_visibility = 'public'
    ) OR
    -- Friends: viewer must be a friend of that user
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.friends_visibility = 'friends'
        AND (
          (p.id = friends.requester_id AND public.is_friend(auth.uid(), friends.requester_id)) OR
          (p.id = friends.receiver_id AND public.is_friend(auth.uid(), friends.receiver_id))
        )
    )
  )
);
