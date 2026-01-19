-- Fix: Restrict staff access to sensitive employee data (national_id, kra_pin, nssf_number, sha_number, bank_account, bank_name, basic_salary)
-- Staff should only be able to view non-sensitive employee information

-- Drop the existing overly permissive staff policy
DROP POLICY IF EXISTS "Staff can view employees" ON public.employees;

-- Create a view for non-sensitive employee data that staff can access
CREATE OR REPLACE VIEW public.employees_safe AS
SELECT 
  id,
  employee_id,
  full_name,
  job_title,
  employment_type,
  hire_date,
  is_active,
  created_at,
  updated_at
  -- Sensitive fields excluded: national_id, kra_pin, nssf_number, sha_number, bank_account, bank_name, basic_salary, housing_allowance, transport_allowance, other_taxable_allowances, non_taxable_allowances
FROM public.employees;

-- Grant select on the safe view to authenticated users
GRANT SELECT ON public.employees_safe TO authenticated;

-- No RLS policy needed for staff on employees table - they should use the view
-- Admins can still access full data via the existing admin policy