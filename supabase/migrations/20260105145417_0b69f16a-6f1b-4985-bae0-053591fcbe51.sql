
-- Create employees table for payroll
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  kra_pin TEXT NOT NULL,
  nssf_number TEXT,
  sha_number TEXT,
  job_title TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'permanent' CHECK (employment_type IN ('permanent', 'contract', 'casual')),
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  housing_allowance NUMERIC DEFAULT 0,
  transport_allowance NUMERIC DEFAULT 0,
  other_taxable_allowances NUMERIC DEFAULT 0,
  non_taxable_allowances NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  hire_date DATE,
  bank_name TEXT,
  bank_account TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create statutory rates configuration table
CREATE TABLE public.statutory_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_type TEXT NOT NULL,
  rate_name TEXT NOT NULL,
  min_amount NUMERIC DEFAULT 0,
  max_amount NUMERIC,
  rate_value NUMERIC NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payroll records table
CREATE TABLE public.payroll_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_period_month INTEGER NOT NULL,
  pay_period_year INTEGER NOT NULL,
  basic_salary NUMERIC NOT NULL,
  housing_allowance NUMERIC DEFAULT 0,
  transport_allowance NUMERIC DEFAULT 0,
  other_taxable_allowances NUMERIC DEFAULT 0,
  non_taxable_allowances NUMERIC DEFAULT 0,
  overtime_pay NUMERIC DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  gross_pay NUMERIC NOT NULL,
  taxable_income NUMERIC NOT NULL,
  paye NUMERIC NOT NULL DEFAULT 0,
  nssf_employee NUMERIC NOT NULL DEFAULT 0,
  nssf_employer NUMERIC NOT NULL DEFAULT 0,
  sha_deduction NUMERIC NOT NULL DEFAULT 0,
  housing_levy_employee NUMERIC DEFAULT 0,
  housing_levy_employer NUMERIC DEFAULT 0,
  other_deductions NUMERIC DEFAULT 0,
  total_deductions NUMERIC NOT NULL,
  net_pay NUMERIC NOT NULL,
  personal_relief NUMERIC DEFAULT 2400,
  insurance_relief NUMERIC DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, pay_period_month, pay_period_year)
);

-- Create custom deductions table
CREATE TABLE public.employee_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  deduction_name TEXT NOT NULL,
  deduction_type TEXT NOT NULL CHECK (deduction_type IN ('sacco', 'loan', 'advance', 'insurance', 'other')),
  amount NUMERIC NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Admins can manage employees" ON public.employees
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view employees" ON public.employees
  FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role));

-- RLS Policies for statutory_rates
CREATE POLICY "Admins can manage statutory rates" ON public.statutory_rates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view statutory rates" ON public.statutory_rates
  FOR SELECT USING (true);

-- RLS Policies for payroll_records
CREATE POLICY "Admins can manage payroll records" ON public.payroll_records
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view payroll records" ON public.payroll_records
  FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role));

-- RLS Policies for employee_deductions
CREATE POLICY "Admins can manage employee deductions" ON public.employee_deductions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view employee deductions" ON public.employee_deductions
  FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_statutory_rates_updated_at
  BEFORE UPDATE ON public.statutory_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_records_updated_at
  BEFORE UPDATE ON public.payroll_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Kenyan statutory rates (2024)
-- PAYE Tax Bands
INSERT INTO public.statutory_rates (rate_type, rate_name, min_amount, max_amount, rate_value, effective_from) VALUES
('paye', 'Band 1 - 10%', 0, 24000, 10, '2024-01-01'),
('paye', 'Band 2 - 25%', 24001, 32333, 25, '2024-01-01'),
('paye', 'Band 3 - 30%', 32334, 500000, 30, '2024-01-01'),
('paye', 'Band 4 - 32.5%', 500001, 800000, 32.5, '2024-01-01'),
('paye', 'Band 5 - 35%', 800001, NULL, 35, '2024-01-01');

-- Personal Relief
INSERT INTO public.statutory_rates (rate_type, rate_name, min_amount, max_amount, rate_value, effective_from) VALUES
('relief', 'Personal Relief', 0, NULL, 2400, '2024-01-01'),
('relief', 'Insurance Relief Max', 0, NULL, 5000, '2024-01-01');

-- NSSF Rates (Tier I & II)
INSERT INTO public.statutory_rates (rate_type, rate_name, min_amount, max_amount, rate_value, effective_from) VALUES
('nssf', 'Tier I Upper Limit', 0, NULL, 7000, '2024-01-01'),
('nssf', 'Tier II Upper Limit', 0, NULL, 36000, '2024-01-01'),
('nssf', 'Contribution Rate', 0, NULL, 6, '2024-01-01');

-- SHA (formerly NHIF) Rates
INSERT INTO public.statutory_rates (rate_type, rate_name, min_amount, max_amount, rate_value, effective_from) VALUES
('sha', 'SHA Rate', 0, NULL, 2.75, '2024-01-01');

-- Housing Levy
INSERT INTO public.statutory_rates (rate_type, rate_name, min_amount, max_amount, rate_value, effective_from) VALUES
('housing_levy', 'Housing Levy Rate', 0, NULL, 1.5, '2024-01-01');
