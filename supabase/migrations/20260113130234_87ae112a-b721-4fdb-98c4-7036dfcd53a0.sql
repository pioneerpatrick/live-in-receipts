-- Add production_url column to company_settings for QR code URLs
ALTER TABLE public.company_settings 
ADD COLUMN production_url TEXT DEFAULT NULL;