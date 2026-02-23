-- Create storage bucket for report evidence
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report-evidence', 'report-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for report evidence
CREATE POLICY IF NOT EXISTS "Authenticated users can upload report evidence" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'report-evidence' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can view their own report evidence" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'report-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Admins can view all report evidence" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'report-evidence' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND (bio ILIKE '%admin%' OR display_name ILIKE '%admin%')
));

-- Add image_url column to profile_reports if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profile_reports' AND column_name = 'image_url') THEN
    ALTER TABLE profile_reports ADD COLUMN image_url TEXT;
  END IF;
END $$;