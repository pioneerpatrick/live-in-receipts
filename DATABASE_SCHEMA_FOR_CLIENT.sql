-- ============================================================
-- LIVE-IN PROPERTIES - COMPLETE DATABASE SCHEMA
-- Generated: 2026-01-26
-- For: Client Supabase Account Setup
-- ============================================================
-- INSTRUCTIONS:
-- 1. Create a new Supabase project
-- 2. Go to SQL Editor in Supabase Dashboard
-- 3. Run this entire script
-- 4. Then import data using the JSON backup from Settings → Backup
-- ============================================================

-- ============================================================
-- PART 1: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PART 2: CUSTOM TYPES (ENUMS)
-- ============================================================
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- PART 3: TABLES
-- ============================================================

-- Profiles table (for user information)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    full_name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User roles table (for role-based access control)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    location text NOT NULL,
    description text,
    total_plots integer NOT NULL DEFAULT 0,
    capacity integer NOT NULL DEFAULT 0,
    buying_price numeric DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Plots table
CREATE TABLE IF NOT EXISTS public.plots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    plot_number text NOT NULL,
    size text NOT NULL,
    price numeric NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'available',
    client_id uuid,
    sold_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    phone text,
    email text,
    project_name text NOT NULL,
    plot_number text NOT NULL,
    unit_price numeric NOT NULL DEFAULT 0,
    number_of_plots integer NOT NULL DEFAULT 1,
    total_price numeric NOT NULL DEFAULT 0,
    discount numeric NOT NULL DEFAULT 0,
    total_paid numeric NOT NULL DEFAULT 0,
    balance numeric NOT NULL DEFAULT 0,
    percent_paid numeric DEFAULT 0,
    sales_agent text,
    payment_type text DEFAULT 'installments',
    payment_period text,
    installment_months integer,
    initial_payment_method text DEFAULT 'Cash',
    commission numeric DEFAULT 0,
    commission_received numeric DEFAULT 0,
    commission_balance numeric DEFAULT 0,
    status text DEFAULT 'ongoing',
    sale_date date,
    completion_date date,
    next_payment_date date,
    notes text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add foreign key for plots.client_id after clients table exists
ALTER TABLE public.plots 
ADD CONSTRAINT plots_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    payment_method text NOT NULL DEFAULT 'Cash',
    payment_date timestamp with time zone NOT NULL DEFAULT now(),
    previous_balance numeric NOT NULL DEFAULT 0,
    new_balance numeric NOT NULL DEFAULT 0,
    receipt_number text NOT NULL,
    agent_name text,
    authorized_by text,
    reference_number text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category text NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL DEFAULT 0,
    expense_date timestamp with time zone NOT NULL DEFAULT now(),
    payment_method text DEFAULT 'Cash',
    recipient text,
    reference_number text,
    client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
    agent_id text,
    is_commission_payout boolean DEFAULT false,
    notes text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Cancelled sales table
CREATE TABLE IF NOT EXISTS public.cancelled_sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name text NOT NULL,
    client_phone text,
    project_name text NOT NULL,
    plot_number text NOT NULL,
    total_price numeric NOT NULL DEFAULT 0,
    total_paid numeric NOT NULL DEFAULT 0,
    refund_amount numeric NOT NULL DEFAULT 0,
    cancellation_fee numeric NOT NULL DEFAULT 0,
    net_refund numeric NOT NULL DEFAULT 0,
    refund_status text NOT NULL DEFAULT 'pending',
    cancellation_reason text,
    outcome_type text DEFAULT 'pending',
    original_sale_date date,
    cancellation_date timestamp with time zone NOT NULL DEFAULT now(),
    transferred_to_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
    transferred_to_project text,
    transferred_to_plot text,
    income_retained numeric DEFAULT 0,
    expense_recorded numeric DEFAULT 0,
    audit_notes text,
    notes text,
    cancelled_by uuid,
    processed_by uuid,
    processed_date timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Employees table (for payroll)
CREATE TABLE IF NOT EXISTS public.employees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id text NOT NULL UNIQUE,
    full_name text NOT NULL,
    national_id text NOT NULL,
    kra_pin text NOT NULL,
    nssf_number text,
    sha_number text,
    job_title text NOT NULL,
    employment_type text NOT NULL DEFAULT 'permanent',
    basic_salary numeric NOT NULL DEFAULT 0,
    housing_allowance numeric DEFAULT 0,
    transport_allowance numeric DEFAULT 0,
    other_taxable_allowances numeric DEFAULT 0,
    non_taxable_allowances numeric DEFAULT 0,
    bank_name text,
    bank_account text,
    hire_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Employee deductions table
CREATE TABLE IF NOT EXISTS public.employee_deductions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    deduction_name text NOT NULL,
    deduction_type text NOT NULL,
    amount numeric NOT NULL,
    is_recurring boolean DEFAULT true,
    start_date date,
    end_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Payroll records table
CREATE TABLE IF NOT EXISTS public.payroll_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    pay_period_month integer NOT NULL,
    pay_period_year integer NOT NULL,
    basic_salary numeric NOT NULL,
    housing_allowance numeric DEFAULT 0,
    transport_allowance numeric DEFAULT 0,
    other_taxable_allowances numeric DEFAULT 0,
    non_taxable_allowances numeric DEFAULT 0,
    overtime_pay numeric DEFAULT 0,
    bonus numeric DEFAULT 0,
    gross_pay numeric NOT NULL,
    taxable_income numeric NOT NULL,
    paye numeric NOT NULL DEFAULT 0,
    nssf_employee numeric NOT NULL DEFAULT 0,
    nssf_employer numeric NOT NULL DEFAULT 0,
    sha_deduction numeric NOT NULL DEFAULT 0,
    housing_levy_employee numeric DEFAULT 0,
    housing_levy_employer numeric DEFAULT 0,
    other_deductions numeric DEFAULT 0,
    total_deductions numeric NOT NULL,
    net_pay numeric NOT NULL,
    personal_relief numeric DEFAULT 2400,
    insurance_relief numeric DEFAULT 0,
    is_locked boolean DEFAULT false,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (employee_id, pay_period_month, pay_period_year)
);

-- Statutory rates table
CREATE TABLE IF NOT EXISTS public.statutory_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_type text NOT NULL,
    rate_name text NOT NULL,
    rate_value numeric NOT NULL,
    min_amount numeric DEFAULT 0,
    max_amount numeric,
    effective_from date NOT NULL,
    effective_to date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Company settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name text NOT NULL DEFAULT 'LIVE-IN PROPERTIES',
    company_tagline text DEFAULT 'Genuine plots with ready title deeds',
    phone text DEFAULT '+254 746 499 499',
    email text DEFAULT 'liveinpropertiesltd@gmail.com',
    email_secondary text DEFAULT 'info@liveinproperties.co.ke',
    social_handle text DEFAULT '@Live-IN Properties',
    website text DEFAULT 'www.liveinproperties.co.ke',
    address text DEFAULT 'Kitengela Africa House',
    po_box text DEFAULT 'P.O. Box 530-00241, KITENGELA',
    logo_url text,
    signature_url text,
    receipt_footer_message text DEFAULT 'Thank you for choosing Live-IN Properties. We Secure your Future.',
    receipt_watermark text DEFAULT 'LIVE-IN PROPERTIES',
    production_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Backup settings table
CREATE TABLE IF NOT EXISTS public.backup_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auto_backup_enabled boolean DEFAULT false,
    backup_frequency text DEFAULT 'weekly',
    last_backup_at timestamp with time zone,
    next_backup_at timestamp with time zone,
    retention_days integer DEFAULT 30,
    email_notifications_enabled boolean DEFAULT false,
    notification_email text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Backup history table
CREATE TABLE IF NOT EXISTS public.backup_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    filename text NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    record_count integer,
    backup_type text DEFAULT 'manual',
    status text DEFAULT 'completed',
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    user_name text,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================
-- PART 4: INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_project_name ON public.clients(project_name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_plots_project_id ON public.plots(project_id);
CREATE INDEX IF NOT EXISTS idx_plots_status ON public.plots(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);

-- ============================================================
-- PART 5: FUNCTIONS
-- ============================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user full name
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

-- Function to calculate percent paid
CREATE OR REPLACE FUNCTION public.calculate_percent_paid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.total_price > 0 THEN
    NEW.percent_paid = ROUND((NEW.total_paid / NEW.total_price) * 100, 2);
  ELSE
    NEW.percent_paid = 0;
  END IF;
  RETURN NEW;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to update project plot count
CREATE OR REPLACE FUNCTION public.update_project_plot_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects 
    SET total_plots = (SELECT COUNT(*) FROM public.plots WHERE project_id = NEW.project_id)
    WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects 
    SET total_plots = (SELECT COUNT(*) FROM public.plots WHERE project_id = OLD.project_id)
    WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Function to reset plot on client delete
CREATE OR REPLACE FUNCTION public.reset_plot_on_client_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.client_id IS NOT NULL AND NEW.client_id IS NULL THEN
    NEW.status := 'available';
    NEW.sold_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Function to cleanup orphaned plots
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_plots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE plots 
  SET status = 'available', sold_at = NULL 
  WHERE status IN ('sold', 'reserved') AND client_id IS NULL;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$;

-- Function to get client payment history
CREATE OR REPLACE FUNCTION public.get_client_payment_history(p_client_id uuid)
RETURNS TABLE(
  client_id uuid,
  client_name text,
  client_phone text,
  project_name text,
  plot_number text,
  total_price numeric,
  discount numeric,
  total_paid numeric,
  balance numeric,
  percent_paid numeric,
  payment_id uuid,
  payment_amount numeric,
  payment_method text,
  payment_date timestamp with time zone,
  previous_balance numeric,
  new_balance numeric,
  receipt_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    c.phone as client_phone,
    c.project_name,
    c.plot_number,
    c.total_price,
    c.discount,
    c.total_paid,
    c.balance,
    c.percent_paid,
    p.id as payment_id,
    p.amount as payment_amount,
    p.payment_method,
    p.payment_date,
    p.previous_balance,
    p.new_balance,
    p.receipt_number
  FROM clients c
  LEFT JOIN payments p ON p.client_id = c.id
  WHERE c.id = p_client_id
  ORDER BY p.payment_date DESC;
END;
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Assign default staff role (admins can upgrade later)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ============================================================
-- PART 6: TRIGGERS
-- ============================================================

-- Trigger for calculating percent paid on clients
DROP TRIGGER IF EXISTS calculate_percent_paid_trigger ON public.clients;
CREATE TRIGGER calculate_percent_paid_trigger
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.calculate_percent_paid();

-- Trigger for updating timestamps
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_plots_updated_at ON public.plots;
CREATE TRIGGER update_plots_updated_at
BEFORE UPDATE ON public.plots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating project plot count
DROP TRIGGER IF EXISTS update_project_plot_count_trigger ON public.plots;
CREATE TRIGGER update_project_plot_count_trigger
AFTER INSERT OR DELETE ON public.plots
FOR EACH ROW
EXECUTE FUNCTION public.update_project_plot_count();

-- Trigger for resetting plot when client is removed
DROP TRIGGER IF EXISTS reset_plot_on_client_delete_trigger ON public.plots;
CREATE TRIGGER reset_plot_on_client_delete_trigger
BEFORE UPDATE ON public.plots
FOR EACH ROW
EXECUTE FUNCTION public.reset_plot_on_client_delete();

-- Trigger for new user signup (connects to auth.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PART 7: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancelled_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: profiles
-- ============================================================
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: user_roles
-- ============================================================
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: projects
-- ============================================================
CREATE POLICY "Users can view projects" ON public.projects
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage projects" ON public.projects
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: plots
-- ============================================================
CREATE POLICY "Staff can view plots" ON public.plots
FOR SELECT USING (has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can manage plots" ON public.plots
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: clients
-- ============================================================
CREATE POLICY "Staff can view own clients" ON public.clients
FOR SELECT USING (has_role(auth.uid(), 'staff') AND created_by = auth.uid());

CREATE POLICY "Staff can insert clients" ON public.clients
FOR INSERT WITH CHECK (has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update own clients" ON public.clients
FOR UPDATE USING (has_role(auth.uid(), 'staff') AND created_by = auth.uid());

CREATE POLICY "Admins can manage clients" ON public.clients
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: payments
-- ============================================================
CREATE POLICY "Staff can view own payments" ON public.payments
FOR SELECT USING (
  has_role(auth.uid(), 'staff') AND 
  (created_by = auth.uid() OR agent_name = get_user_full_name(auth.uid()))
);

CREATE POLICY "Staff can insert payments" ON public.payments
FOR INSERT WITH CHECK (has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can manage payments" ON public.payments
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: expenses
-- ============================================================
CREATE POLICY "Admins can manage expenses" ON public.expenses
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: cancelled_sales
-- ============================================================
CREATE POLICY "Staff can view cancelled sales" ON public.cancelled_sales
FOR SELECT USING (has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can manage cancelled sales" ON public.cancelled_sales
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: employees
-- ============================================================
CREATE POLICY "Admins can manage employees" ON public.employees
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: employee_deductions
-- ============================================================
CREATE POLICY "Staff can view employee deductions" ON public.employee_deductions
FOR SELECT USING (has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can manage employee deductions" ON public.employee_deductions
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: payroll_records
-- ============================================================
CREATE POLICY "Staff can view payroll records" ON public.payroll_records
FOR SELECT USING (has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can manage payroll records" ON public.payroll_records
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: statutory_rates
-- ============================================================
CREATE POLICY "Users can view statutory rates" ON public.statutory_rates
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage statutory rates" ON public.statutory_rates
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: company_settings
-- ============================================================
CREATE POLICY "Users can view company settings" ON public.company_settings
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage company settings" ON public.company_settings
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: backup_settings
-- ============================================================
CREATE POLICY "Admins can view backup settings" ON public.backup_settings
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert backup settings" ON public.backup_settings
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update backup settings" ON public.backup_settings
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: backup_history
-- ============================================================
CREATE POLICY "Admins can view backup history" ON public.backup_history
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert backup history" ON public.backup_history
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete backup history" ON public.backup_history
FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: activity_logs
-- ============================================================
CREATE POLICY "Admins can view activity logs" ON public.activity_logs
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert activity logs" ON public.activity_logs
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PART 8: STORAGE BUCKETS
-- ============================================================
-- Run these in the Supabase Dashboard SQL Editor:

INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('database-backups', 'database-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company-logos (public bucket)
CREATE POLICY "Public can view company logos" ON storage.objects
FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "Admins can upload company logos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'company-logos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update company logos" ON storage.objects
FOR UPDATE USING (bucket_id = 'company-logos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete company logos" ON storage.objects
FOR DELETE USING (bucket_id = 'company-logos' AND has_role(auth.uid(), 'admin'));

-- Storage policies for database-backups (private bucket)
CREATE POLICY "Admins can view backups" ON storage.objects
FOR SELECT USING (bucket_id = 'database-backups' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload backups" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'database-backups' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete backups" ON storage.objects
FOR DELETE USING (bucket_id = 'database-backups' AND has_role(auth.uid(), 'admin'));

-- ============================================================
-- PART 9: INITIAL DATA (Optional - only if needed)
-- ============================================================

-- Insert default company settings (will be overwritten by JSON import)
INSERT INTO public.company_settings (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Insert default backup settings
INSERT INTO public.backup_settings (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- ============================================================
-- SETUP COMPLETE!
-- ============================================================
-- Next Steps:
-- 1. Create admin user in Supabase Auth
-- 2. Manually add admin role: 
--    INSERT INTO user_roles (user_id, role) VALUES ('USER_UUID_HERE', 'admin');
-- 3. Import data using Settings → Backup → Restore in the app
-- 4. Configure RESEND_API_KEY in Supabase secrets for email functionality
-- 5. Deploy edge functions from supabase/functions/ folder
-- ============================================================
