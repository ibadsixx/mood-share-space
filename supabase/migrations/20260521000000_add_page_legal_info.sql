-- Add legal_info column to pages table for privacy/legal fields
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS legal_info jsonb DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_pages_legal_info ON public.pages USING gin(legal_info);
