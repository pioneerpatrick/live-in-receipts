
-- Add unique constraint on receipt_number column to prevent duplicates
ALTER TABLE public.payments
ADD CONSTRAINT payments_receipt_number_unique UNIQUE (receipt_number);
