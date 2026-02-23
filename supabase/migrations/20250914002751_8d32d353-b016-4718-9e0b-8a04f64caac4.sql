-- Create storage bucket for report evidence
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report-evidence', 'report-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Add image_url column to profile_reports if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profile_reports' AND column_name = 'image_url') THEN
    ALTER TABLE profile_reports ADD COLUMN image_url TEXT;
  END IF;
END $$;