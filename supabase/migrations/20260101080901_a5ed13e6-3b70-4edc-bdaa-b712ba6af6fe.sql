-- Add payment_type column to clients table
ALTER TABLE public.clients 
ADD COLUMN payment_type text DEFAULT 'installments';

-- Add a comment for documentation
COMMENT ON COLUMN public.clients.payment_type IS 'Type of payment: installments or cash';