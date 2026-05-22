-- Create the leave-documents storage bucket (public so documents can be linked directly)
INSERT INTO storage.buckets (id, name, public)
VALUES ('leave-documents', 'leave-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to the bucket
CREATE POLICY "authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'leave-documents');

-- Allow authenticated users to read any document in the bucket
CREATE POLICY "authenticated_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'leave-documents');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'leave-documents');
