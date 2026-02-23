-- Rename hidden_profile_id to profile_id
ALTER TABLE public.hidden_content RENAME COLUMN hidden_profile_id TO profile_id;

-- Drop reason column
ALTER TABLE public.hidden_content DROP COLUMN IF EXISTS reason;

-- Drop the hidden_reels table entirely
DROP TABLE IF EXISTS public.hidden_reels;

-- Ensure proper indexes exist for efficient filtering
CREATE INDEX IF NOT EXISTS hidden_content_user_content_idx ON public.hidden_content (user_id, content_id);
CREATE INDEX IF NOT EXISTS hidden_content_user_profile_idx ON public.hidden_content (user_id, profile_id);

-- Drop existing policies and recreate clean ones
DROP POLICY IF EXISTS "Users can view their own hidden content" ON public.hidden_content;
DROP POLICY IF EXISTS "Users can hide content" ON public.hidden_content;
DROP POLICY IF EXISTS "Users can unhide content" ON public.hidden_content;
DROP POLICY IF EXISTS "Users can view own hidden content" ON public.hidden_content;
DROP POLICY IF EXISTS "Users can create hidden content entries" ON public.hidden_content;
DROP POLICY IF EXISTS "Users can delete own hidden content entries" ON public.hidden_content;

-- Create clean RLS policies
CREATE POLICY "Users can view own hidden content"
ON public.hidden_content
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert hidden content"
ON public.hidden_content
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own hidden content"
ON public.hidden_content
FOR DELETE
USING (auth.uid() = user_id);

-- Ensure unique constraint for content hiding
DROP INDEX IF EXISTS hidden_content_unique_content;
DROP INDEX IF EXISTS hidden_content_unique_profile;
CREATE UNIQUE INDEX IF NOT EXISTS hidden_content_unique_content ON public.hidden_content (user_id, content_id) WHERE content_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS hidden_content_unique_profile ON public.hidden_content (user_id, profile_id) WHERE profile_id IS NOT NULL;