-- Add reference_number column to payments table for bank reconciliation
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reference_number text;

-- Comment explaining the purpose
COMMENT ON COLUMN public.payments.reference_number IS 'Bank/M-Pesa reference number for reconciliation with bank statements';