-- Drop the problematic policy causing infinite recursion
DROP POLICY IF EXISTS "Tenant admins can view their tenant users" ON public.tenant_users;

-- Create a security definer function to check tenant membership
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
  )
$$;

-- Create a security definer function to get user's tenant ID
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.tenant_users
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Recreate policy using the security definer function
CREATE POLICY "Users can view their own tenant memberships" ON public.tenant_users
FOR SELECT USING (
  user_id = auth.uid() OR is_super_admin(auth.uid())
);

-- Also allow users to see other users in their tenant
CREATE POLICY "Tenant members can view their co-members" ON public.tenant_users
FOR SELECT USING (
  tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid())
);