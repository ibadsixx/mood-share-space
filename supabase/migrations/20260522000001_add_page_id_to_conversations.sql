ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES public.pages(id) ON DELETE SET NULL;
