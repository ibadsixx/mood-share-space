ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS family_members jsonb DEFAULT '[]'::jsonb NOT NULL;
