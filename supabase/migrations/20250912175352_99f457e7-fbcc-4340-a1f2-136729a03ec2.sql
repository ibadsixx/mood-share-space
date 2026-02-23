-- Add cover_position_y column to profiles table for cover photo repositioning
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cover_position_y integer DEFAULT 0;

-- Update the existing cover photo storage bucket to ensure it's properly configured
-- (covers bucket already exists, just ensuring it's public)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'covers';

-- Add RLS policy for cover photos storage if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can upload cover photos'
    ) THEN
        CREATE POLICY "Users can upload cover photos"
        ON storage.objects FOR INSERT 
        WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can update their cover photos'
    ) THEN
        CREATE POLICY "Users can update their cover photos"
        ON storage.objects FOR UPDATE 
        USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can delete their cover photos'
    ) THEN
        CREATE POLICY "Users can delete their cover photos"
        ON storage.objects FOR DELETE 
        USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END $$;