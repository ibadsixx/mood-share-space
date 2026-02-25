
ALTER TABLE public.groups ADD COLUMN privacy TEXT NOT NULL DEFAULT 'public';
ALTER TABLE public.groups ADD COLUMN invite_followers BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.groups ADD COLUMN created_by UUID REFERENCES auth.users(id);
