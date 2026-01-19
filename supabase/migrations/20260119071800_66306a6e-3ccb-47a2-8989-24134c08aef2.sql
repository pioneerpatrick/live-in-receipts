-- Update company settings with production URL
UPDATE public.company_settings 
SET production_url = 'https://receipts.live-inproperties.co.ke',
    updated_at = now();