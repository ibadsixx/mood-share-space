-- Add work_education column to pages table
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS work_education jsonb DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_pages_work_education ON public.pages USING gin(work_education);
