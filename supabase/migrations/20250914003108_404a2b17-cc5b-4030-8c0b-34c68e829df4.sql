-- Add missing storage policies for report evidence bucket
DO $$
BEGIN
  -- Check if policies already exist before creating them
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload report evidence'
  ) THEN
    CREATE POLICY "Authenticated users can upload report evidence" 
    ON storage.objects 
    FOR INSERT 
    WITH CHECK (bucket_id = 'report-evidence' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view their own report evidence'
  ) THEN
    CREATE POLICY "Users can view their own report evidence" 
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'report-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can view all report evidence'
  ) THEN
    CREATE POLICY "Admins can view all report evidence" 
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'report-evidence' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (bio ILIKE '%admin%' OR display_name ILIKE '%admin%')
    ));
  END IF;
END $$;