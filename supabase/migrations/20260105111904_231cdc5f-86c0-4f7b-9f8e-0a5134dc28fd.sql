-- Add created_by column to payments table to track who created each payment
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments(created_by);

-- Drop existing RLS policies on payments
DROP POLICY IF EXISTS "Admins and staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Admins and staff can insert payments" ON public.payments;

-- New policy: Staff can only view their own payments, admins can view all
CREATE POLICY "Staff can view own payments, admins can view all"
ON public.payments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  (has_role(auth.uid(), 'staff') AND created_by = auth.uid())
);

-- New policy: Staff can insert payments (with their user_id as created_by)
CREATE POLICY "Staff and admins can insert payments"
ON public.payments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  (has_role(auth.uid(), 'staff') AND (created_by IS NULL OR created_by = auth.uid()))
);

-- Drop existing RLS policies on clients that allow full access
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

-- New policy: Staff can only view clients linked to their payments, admins can view all
CREATE POLICY "Staff can view own clients, admins can view all"
ON public.clients
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  (has_role(auth.uid(), 'staff') AND EXISTS (
    SELECT 1 FROM public.payments 
    WHERE payments.client_id = clients.id 
    AND payments.created_by = auth.uid()
  ))
);