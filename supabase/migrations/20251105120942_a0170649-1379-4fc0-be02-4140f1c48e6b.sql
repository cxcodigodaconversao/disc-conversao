-- Create storage bucket for assessment reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment-reports', 'assessment-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view reports
CREATE POLICY "Public can view assessment reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'assessment-reports');

-- Allow service role to upload reports
CREATE POLICY "Service role can upload reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assessment-reports');