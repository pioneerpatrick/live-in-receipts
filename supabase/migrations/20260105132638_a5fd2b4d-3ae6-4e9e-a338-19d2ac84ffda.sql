-- Create a function to get user's full name (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_full_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Drop the existing SELECT policy on payments
DROP POLICY IF EXISTS "Staff can view own payments, admins can view all" ON public.payments;

-- Create updated policy that allows staff to view payments they created OR where they are the agent
CREATE POLICY "Staff can view own payments, admins can view all" 
ON public.payments 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    has_role(auth.uid(), 'staff'::app_role) 
    AND (
      created_by = auth.uid() 
      OR agent_name = get_user_full_name(auth.uid())
    )
  )
);