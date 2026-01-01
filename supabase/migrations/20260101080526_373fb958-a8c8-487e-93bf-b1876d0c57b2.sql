-- Fix Issue 1: Payment Records Accessible to All Staff (PUBLIC_DATA_EXPOSURE)
-- Replace overly permissive SELECT policy with role-based access
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;

CREATE POLICY "Admins and staff can view payments"
ON public.payments FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)
);

-- Fix Issue 2: Unrestricted Payment Creation (MISSING_RLS)
-- Replace overly permissive INSERT policy with role-based access
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;

CREATE POLICY "Admins and staff can insert payments"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)
);