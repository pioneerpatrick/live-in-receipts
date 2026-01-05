
-- Drop the existing restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Admins can delete payments" ON payments;

CREATE POLICY "Admins can delete payments" 
ON payments 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
