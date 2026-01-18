-- ================================================
-- TENANT-AWARE RLS POLICIES FOR COMPLETE DATA ISOLATION
-- ================================================

-- First, create helper function to check if user can access tenant data
CREATE OR REPLACE FUNCTION public.can_access_tenant_data(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_super_admin(auth.uid()) OR 
    get_user_tenant_id(auth.uid()) = _tenant_id
$$;

-- ================================================
-- CLIENTS TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Staff can view own clients, admins can view all" ON public.clients;
DROP POLICY IF EXISTS "Admins and staff can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update all clients, staff can update own" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;

CREATE POLICY "Users can view clients in their tenant" ON public.clients
FOR SELECT USING (
  can_access_tenant_data(tenant_id) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    (has_role(auth.uid(), 'staff'::app_role) AND created_by = auth.uid())
  )
);

CREATE POLICY "Users can insert clients in their tenant" ON public.clients
FOR INSERT WITH CHECK (
  can_access_tenant_data(tenant_id) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'staff'::app_role)
  )
);

CREATE POLICY "Users can update clients in their tenant" ON public.clients
FOR UPDATE USING (
  can_access_tenant_data(tenant_id) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    (has_role(auth.uid(), 'staff'::app_role) AND created_by = auth.uid())
  )
);

CREATE POLICY "Admins can delete clients in their tenant" ON public.clients
FOR DELETE USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

-- ================================================
-- PAYMENTS TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Staff can view own payments, admins can view all" ON public.payments;
DROP POLICY IF EXISTS "Staff and admins can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;

CREATE POLICY "Users can view payments in their tenant" ON public.payments
FOR SELECT USING (
  can_access_tenant_data(tenant_id) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    (has_role(auth.uid(), 'staff'::app_role) AND (created_by = auth.uid() OR agent_name = get_user_full_name(auth.uid())))
  )
);

CREATE POLICY "Users can insert payments in their tenant" ON public.payments
FOR INSERT WITH CHECK (
  can_access_tenant_data(tenant_id) AND (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)
  )
);

CREATE POLICY "Admins can update payments in their tenant" ON public.payments
FOR UPDATE USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete payments in their tenant" ON public.payments
FOR DELETE USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

-- ================================================
-- PROJECTS TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;

CREATE POLICY "Users can view projects in their tenant" ON public.projects
FOR SELECT USING (can_access_tenant_data(tenant_id));

CREATE POLICY "Admins can insert projects in their tenant" ON public.projects
FOR INSERT WITH CHECK (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update projects in their tenant" ON public.projects
FOR UPDATE USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete projects in their tenant" ON public.projects
FOR DELETE USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

-- ================================================
-- PLOTS TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Authenticated users can view plots" ON public.plots;
DROP POLICY IF EXISTS "Admins can insert plots" ON public.plots;
DROP POLICY IF EXISTS "Admins can update plots" ON public.plots;
DROP POLICY IF EXISTS "Admins can delete plots" ON public.plots;

CREATE POLICY "Users can view plots in their tenant" ON public.plots
FOR SELECT USING (can_access_tenant_data(tenant_id));

CREATE POLICY "Admins can insert plots in their tenant" ON public.plots
FOR INSERT WITH CHECK (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update plots in their tenant" ON public.plots
FOR UPDATE USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete plots in their tenant" ON public.plots
FOR DELETE USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

-- ================================================
-- EXPENSES TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Admins can view all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;

CREATE POLICY "Admins can view expenses in their tenant" ON public.expenses
FOR SELECT USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can insert expenses in their tenant" ON public.expenses
FOR INSERT WITH CHECK (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update expenses in their tenant" ON public.expenses
FOR UPDATE USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete expenses in their tenant" ON public.expenses
FOR DELETE USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

-- ================================================
-- EMPLOYEES TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Staff can view employees" ON public.employees;

CREATE POLICY "Admins can manage employees in their tenant" ON public.employees
FOR ALL USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can view employees in their tenant" ON public.employees
FOR SELECT USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'staff'::app_role)
);

-- ================================================
-- EMPLOYEE_DEDUCTIONS TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Admins can manage employee deductions" ON public.employee_deductions;
DROP POLICY IF EXISTS "Staff can view employee deductions" ON public.employee_deductions;

CREATE POLICY "Admins can manage employee deductions in their tenant" ON public.employee_deductions
FOR ALL USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can view employee deductions in their tenant" ON public.employee_deductions
FOR SELECT USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'staff'::app_role)
);

-- ================================================
-- PAYROLL_RECORDS TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Admins can manage payroll records" ON public.payroll_records;
DROP POLICY IF EXISTS "Staff can view payroll records" ON public.payroll_records;

CREATE POLICY "Admins can manage payroll records in their tenant" ON public.payroll_records
FOR ALL USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can view payroll records in their tenant" ON public.payroll_records
FOR SELECT USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'staff'::app_role)
);

-- ================================================
-- STATUTORY_RATES TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Admins can manage statutory rates" ON public.statutory_rates;
DROP POLICY IF EXISTS "Staff can view statutory rates" ON public.statutory_rates;

CREATE POLICY "Admins can manage statutory rates in their tenant" ON public.statutory_rates
FOR ALL USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can view statutory rates in their tenant" ON public.statutory_rates
FOR SELECT USING (can_access_tenant_data(tenant_id));

-- ================================================
-- CANCELLED_SALES TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Admins can manage cancelled sales" ON public.cancelled_sales;
DROP POLICY IF EXISTS "Staff can view cancelled sales" ON public.cancelled_sales;

CREATE POLICY "Admins can manage cancelled sales in their tenant" ON public.cancelled_sales
FOR ALL USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can view cancelled sales in their tenant" ON public.cancelled_sales
FOR SELECT USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'staff'::app_role)
);

-- ================================================
-- COMPANY_SETTINGS TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Authenticated users can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can insert company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;

CREATE POLICY "Users can view company settings in their tenant" ON public.company_settings
FOR SELECT USING (can_access_tenant_data(tenant_id));

CREATE POLICY "Admins can insert company settings in their tenant" ON public.company_settings
FOR INSERT WITH CHECK (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update company settings in their tenant" ON public.company_settings
FOR UPDATE USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

-- ================================================
-- ACTIVITY_LOGS TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;

CREATE POLICY "Admins can view activity logs in their tenant" ON public.activity_logs
FOR SELECT USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert activity logs in their tenant" ON public.activity_logs
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- ================================================
-- PROFILES TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view profiles in their tenant" ON public.profiles
FOR SELECT USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- ================================================
-- USER_ROLES TABLE - Update policies with tenant isolation
-- ================================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view roles in their tenant" ON public.user_roles
FOR SELECT USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can manage roles in their tenant" ON public.user_roles
FOR ALL USING (
  can_access_tenant_data(tenant_id) AND has_role(auth.uid(), 'admin'::app_role)
);