-- Add email column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email) WHERE email IS NOT NULL;