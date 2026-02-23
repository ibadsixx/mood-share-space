-- Create storage bucket for editor videos (draft/work-in-progress videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('editor_videos', 'editor_videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to editor_videos bucket
CREATE POLICY "Users can upload editor videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'editor_videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own editor videos
CREATE POLICY "Users can read own editor videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'editor_videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to editor videos (for playback)
CREATE POLICY "Public can read editor videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'editor_videos');

-- Allow users to delete their own editor videos
CREATE POLICY "Users can delete own editor videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'editor_videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own editor videos
CREATE POLICY "Users can update own editor videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'editor_videos' AND auth.uid()::text = (storage.foldername(name))[1]);