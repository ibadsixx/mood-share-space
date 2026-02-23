-- Create storage bucket for report evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('report-evidence', 'report-evidence', false);

-- Create storage policies for report evidence
CREATE POLICY "Authenticated users can upload report evidence" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'report-evidence' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view their own report evidence" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'report-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all report evidence" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'report-evidence' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND (bio ILIKE '%admin%' OR display_name ILIKE '%admin%')
));

-- Add image_url column to profile_reports if it doesn't exist
ALTER TABLE profile_reports ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add unique constraint to prevent duplicate pending reports
ALTER TABLE profile_reports ADD CONSTRAINT unique_pending_report 
UNIQUE (reported_user_id, reporter_user_id, status) 
DEFERRABLE INITIALLY DEFERRED;