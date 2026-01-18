-- Add signature_url column to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS signature_url TEXT;