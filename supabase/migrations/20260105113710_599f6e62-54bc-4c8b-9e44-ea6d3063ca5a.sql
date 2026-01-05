-- Add installment_months column to clients table for tracking payment duration
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS installment_months integer DEFAULT NULL;

-- Add initial_payment_method column to track how the initial payment was made
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS initial_payment_method text DEFAULT 'Cash';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_clients_installment_months ON public.clients(installment_months);
CREATE INDEX IF NOT EXISTS idx_clients_initial_payment_method ON public.clients(initial_payment_method);