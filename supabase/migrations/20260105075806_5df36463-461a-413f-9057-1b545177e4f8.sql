-- Create company_settings table for storing company details and receipt customization
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'LIVE-IN PROPERTIES',
  company_tagline text DEFAULT 'Genuine plots with ready title deeds',
  phone text DEFAULT '+254 746 499 499',
  email text DEFAULT 'liveinpropertiesltd@gmail.com',
  email_secondary text DEFAULT 'info@liveinproperties.co.ke',
  social_handle text DEFAULT '@Live-IN Properties',
  website text DEFAULT 'www.liveinproperties.co.ke',
  address text DEFAULT 'Kitengela Africa House',
  po_box text DEFAULT 'P.O. Box 530-00241, KITENGELA',
  receipt_footer_message text DEFAULT 'Thank you for choosing Live-IN Properties. We Secure your Future.',
  receipt_watermark text DEFAULT 'LIVE-IN PROPERTIES',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Only one settings row should exist (singleton pattern)
CREATE UNIQUE INDEX company_settings_singleton ON public.company_settings ((true));

-- RLS Policies
CREATE POLICY "Authenticated users can view company settings"
ON public.company_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can update company settings"
ON public.company_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert company settings"
ON public.company_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company settings
INSERT INTO public.company_settings (
  company_name,
  company_tagline,
  phone,
  email,
  email_secondary,
  social_handle,
  website,
  address,
  po_box,
  receipt_footer_message,
  receipt_watermark
) VALUES (
  'LIVE-IN PROPERTIES',
  'Genuine plots with ready title deeds',
  '+254 746 499 499',
  'liveinpropertiesltd@gmail.com',
  'info@liveinproperties.co.ke',
  '@Live-IN Properties',
  'www.liveinproperties.co.ke',
  'Kitengela Africa House',
  'P.O. Box 530-00241, KITENGELA',
  'Thank you for choosing Live-IN Properties. We Secure your Future.',
  'LIVE-IN PROPERTIES'
);