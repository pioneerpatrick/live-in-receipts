-- Add created_by column to clients table to track who added each client
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Update RLS policy for staff viewing clients
DROP POLICY IF EXISTS "Staff can view own clients, admins can view all" ON public.clients;

CREATE POLICY "Staff can view own clients, admins can view all" 
ON public.clients 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    has_role(auth.uid(), 'staff'::app_role) 
    AND created_by = auth.uid()
  )
);

-- Update INSERT policy to ensure created_by is set
DROP POLICY IF EXISTS "Admins and staff can insert clients" ON public.clients;

CREATE POLICY "Admins and staff can insert clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    has_role(auth.uid(), 'staff'::app_role) 
    AND (created_by IS NULL OR created_by = auth.uid())
  )
);

-- Update UPDATE policy - staff can only update their own clients
DROP POLICY IF EXISTS "Admins and staff can update clients" ON public.clients;

CREATE POLICY "Admins can update all clients, staff can update own" 
ON public.clients 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    has_role(auth.uid(), 'staff'::app_role) 
    AND created_by = auth.uid()
  )
);