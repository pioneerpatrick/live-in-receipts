-- Add logo_url column to company_settings
ALTER TABLE public.company_settings
ADD COLUMN logo_url text DEFAULT NULL;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);

-- Allow authenticated users to view logos (public bucket)
CREATE POLICY "Anyone can view company logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-logos');

-- Only admins can upload/update logos
CREATE POLICY "Admins can upload company logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'company-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update company logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'company-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete company logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'company-logos' AND has_role(auth.uid(), 'admin'::app_role));