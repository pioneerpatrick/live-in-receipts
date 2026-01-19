-- First drop ALL tenant-related policies from all tables

-- clients policies
DROP POLICY IF EXISTS "Users can view clients in their tenant" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients in their tenant" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients in their tenant" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients in their tenant" ON public.clients;

-- payments policies
DROP POLICY IF EXISTS "Users can view payments in their tenant" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments in their tenant" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments in their tenant" ON public.payments;
DROP POLICY IF EXISTS "Admins can delete payments in their tenant" ON public.payments;

-- projects policies
DROP POLICY IF EXISTS "Users can view projects in their tenant" ON public.projects;
DROP POLICY IF EXISTS "Admins can insert projects in their tenant" ON public.projects;
DROP POLICY IF EXISTS "Admins can update projects in their tenant" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects in their tenant" ON public.projects;

-- plots policies
DROP POLICY IF EXISTS "Users can view plots in their tenant" ON public.plots;
DROP POLICY IF EXISTS "Admins can insert plots in their tenant" ON public.plots;
DROP POLICY IF EXISTS "Admins can update plots in their tenant" ON public.plots;
DROP POLICY IF EXISTS "Admins can delete plots in their tenant" ON public.plots;

-- expenses policies
DROP POLICY IF EXISTS "Admins can view expenses in their tenant" ON public.expenses;
DROP POLICY IF EXISTS "Admins can insert expenses in their tenant" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update expenses in their tenant" ON public.expenses;
DROP POLICY IF EXISTS "Admins can delete expenses in their tenant" ON public.expenses;

-- employees policies
DROP POLICY IF EXISTS "Admins can manage employees in their tenant" ON public.employees;
DROP POLICY IF EXISTS "Staff can view employees in their tenant" ON public.employees;

-- employee_deductions policies
DROP POLICY IF EXISTS "Admins can manage employee deductions in their tenant" ON public.employee_deductions;
DROP POLICY IF EXISTS "Staff can view employee deductions in their tenant" ON public.employee_deductions;

-- payroll_records policies
DROP POLICY IF EXISTS "Admins can manage payroll records in their tenant" ON public.payroll_records;
DROP POLICY IF EXISTS "Staff can view payroll records in their tenant" ON public.payroll_records;

-- statutory_rates policies
DROP POLICY IF EXISTS "Admins can manage statutory rates in their tenant" ON public.statutory_rates;
DROP POLICY IF EXISTS "Staff can view statutory rates in their tenant" ON public.statutory_rates;

-- cancelled_sales policies
DROP POLICY IF EXISTS "Admins can manage cancelled sales in their tenant" ON public.cancelled_sales;
DROP POLICY IF EXISTS "Staff can view cancelled sales in their tenant" ON public.cancelled_sales;

-- company_settings policies
DROP POLICY IF EXISTS "Users can view company settings in their tenant" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can insert company settings in their tenant" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can update company settings in their tenant" ON public.company_settings;

-- activity_logs policies
DROP POLICY IF EXISTS "Admins can view activity logs in their tenant" ON public.activity_logs;

-- profiles policies
DROP POLICY IF EXISTS "Admins can view profiles in their tenant" ON public.profiles;

-- user_roles policies
DROP POLICY IF EXISTS "Admins can view roles in their tenant" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their tenant" ON public.user_roles;

-- tenant_users policies
DROP POLICY IF EXISTS "Super admins can manage tenant users" ON public.tenant_users;
DROP POLICY IF EXISTS "Tenant members can view their co-members" ON public.tenant_users;
DROP POLICY IF EXISTS "Users can view their own tenant memberships" ON public.tenant_users;

-- tenants policies
DROP POLICY IF EXISTS "Super admins can manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;

-- super_admins policies
DROP POLICY IF EXISTS "Only super admins can view super admins" ON public.super_admins;

-- Now drop tenant-related tables
DROP TABLE IF EXISTS public.tenant_users CASCADE;
DROP TABLE IF EXISTS public.super_admins CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

-- Now drop tenant-related functions
DROP FUNCTION IF EXISTS public.can_access_tenant_data(uuid);
DROP FUNCTION IF EXISTS public.get_user_tenant_id(uuid);
DROP FUNCTION IF EXISTS public.is_super_admin(uuid);

-- Remove tenant_id columns from all tables
ALTER TABLE public.employee_deductions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.plots DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.expenses DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.payroll_records DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.payments DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.employees DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.user_roles DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.statutory_rates DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.clients DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.company_settings DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.cancelled_sales DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.activity_logs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.projects DROP COLUMN IF EXISTS tenant_id;

-- Create simplified RLS policies for single-user system

-- employee_deductions policies
CREATE POLICY "Admins can manage employee deductions" ON public.employee_deductions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view employee deductions" ON public.employee_deductions FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role));

-- plots policies
CREATE POLICY "Admins can manage plots" ON public.plots FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view plots" ON public.plots FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role));

-- expenses policies
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- payroll_records policies
CREATE POLICY "Admins can manage payroll records" ON public.payroll_records FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view payroll records" ON public.payroll_records FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role));

-- payments policies
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can insert payments" ON public.payments FOR INSERT WITH CHECK (has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can view own payments" ON public.payments FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role) AND (created_by = auth.uid() OR agent_name = get_user_full_name(auth.uid())));

-- employees policies
CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view employees" ON public.employees FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role));

-- user_roles policies
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- statutory_rates policies
CREATE POLICY "Admins can manage statutory rates" ON public.statutory_rates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view statutory rates" ON public.statutory_rates FOR SELECT USING (auth.uid() IS NOT NULL);

-- clients policies
CREATE POLICY "Admins can manage clients" ON public.clients FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can insert clients" ON public.clients FOR INSERT WITH CHECK (has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can view own clients" ON public.clients FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role) AND created_by = auth.uid());
CREATE POLICY "Staff can update own clients" ON public.clients FOR UPDATE USING (has_role(auth.uid(), 'staff'::app_role) AND created_by = auth.uid());

-- company_settings policies
CREATE POLICY "Admins can manage company settings" ON public.company_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view company settings" ON public.company_settings FOR SELECT USING (auth.uid() IS NOT NULL);

-- cancelled_sales policies
CREATE POLICY "Admins can manage cancelled sales" ON public.cancelled_sales FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view cancelled sales" ON public.cancelled_sales FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role));

-- profiles policies
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- activity_logs policies
CREATE POLICY "Admins can view activity logs" ON public.activity_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- projects policies
CREATE POLICY "Admins can manage projects" ON public.projects FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view projects" ON public.projects FOR SELECT USING (auth.uid() IS NOT NULL);