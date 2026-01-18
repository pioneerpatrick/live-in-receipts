-- ================================================
-- MULTI-TENANT SAAS ARCHITECTURE MIGRATION
-- ================================================

-- Create tenants table for managing client organizations
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0F172A',
  secondary_color TEXT DEFAULT '#3B82F6',
  accent_color TEXT DEFAULT '#10B981',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  subscription_plan TEXT DEFAULT 'standard',
  max_users INTEGER DEFAULT 10,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant_users table to associate users with tenants
CREATE TABLE public.tenant_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_tenant_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Create super_admins table for Technopanaly master admins
CREATE TABLE public.super_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add tenant_id to all existing tables
ALTER TABLE public.clients ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.plots ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.employees ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.employee_deductions ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.payroll_records ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.cancelled_sales ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.activity_logs ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.company_settings ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.statutory_rates ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create indexes for tenant_id on all tables
CREATE INDEX idx_clients_tenant ON public.clients(tenant_id);
CREATE INDEX idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX idx_plots_tenant ON public.plots(tenant_id);
CREATE INDEX idx_expenses_tenant ON public.expenses(tenant_id);
CREATE INDEX idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX idx_employee_deductions_tenant ON public.employee_deductions(tenant_id);
CREATE INDEX idx_payroll_records_tenant ON public.payroll_records(tenant_id);
CREATE INDEX idx_cancelled_sales_tenant ON public.cancelled_sales(tenant_id);
CREATE INDEX idx_activity_logs_tenant ON public.activity_logs(tenant_id);
CREATE INDEX idx_company_settings_tenant ON public.company_settings(tenant_id);
CREATE INDEX idx_statutory_rates_tenant ON public.statutory_rates(tenant_id);
CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_tenants_domain ON public.tenants(domain);
CREATE INDEX idx_tenant_users_user ON public.tenant_users(user_id);

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = _user_id
  )
$$;

-- Create function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT tenant_id FROM public.tenant_users WHERE user_id = _user_id LIMIT 1
$$;

-- Create function to check if user belongs to tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  ) OR public.is_super_admin(_user_id)
$$;

-- Enable RLS on new tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenants table
CREATE POLICY "Super admins can manage tenants"
ON public.tenants FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own tenant"
ON public.tenants FOR SELECT
USING (id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS policies for tenant_users table
CREATE POLICY "Super admins can manage tenant users"
ON public.tenant_users FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant admins can view their tenant users"
ON public.tenant_users FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS policies for super_admins table
CREATE POLICY "Only super admins can view super admins"
ON public.super_admins FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Create trigger for updated_at on tenants
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- MIGRATE EXISTING DATA TO FIRST TENANT (LIVE-PROPERTIES)
-- ================================================

-- Insert LIVE-PROPERTIES as first tenant
INSERT INTO public.tenants (
  name, 
  slug, 
  domain, 
  primary_color, 
  secondary_color, 
  accent_color,
  status,
  contact_email,
  contact_phone,
  address
) VALUES (
  'LIVE-IN PROPERTIES',
  'live-in-properties',
  'reciepts.liveinproperties.co.ke',
  '#0F172A',
  '#3B82F6',
  '#10B981',
  'active',
  'liveinpropertiesltd@gmail.com',
  '+254 746 499 499',
  'Kitengela Africa House'
);

-- Get the tenant ID we just created
DO $$
DECLARE
  live_properties_tenant_id UUID;
BEGIN
  SELECT id INTO live_properties_tenant_id FROM public.tenants WHERE slug = 'live-in-properties';
  
  -- Update all existing data to belong to LIVE-PROPERTIES tenant
  UPDATE public.clients SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.payments SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.projects SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.plots SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.expenses SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.employees SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.employee_deductions SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.payroll_records SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.cancelled_sales SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.activity_logs SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.company_settings SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.statutory_rates SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.user_roles SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.profiles SET tenant_id = live_properties_tenant_id WHERE tenant_id IS NULL;
  
  -- Associate all existing users with LIVE-PROPERTIES tenant
  INSERT INTO public.tenant_users (tenant_id, user_id, is_tenant_admin)
  SELECT live_properties_tenant_id, user_id, (role = 'admin')
  FROM public.user_roles
  ON CONFLICT (tenant_id, user_id) DO NOTHING;
END $$;