export interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  national_id: string;
  kra_pin: string;
  nssf_number: string | null;
  sha_number: string | null;
  job_title: string;
  employment_type: 'permanent' | 'contract' | 'casual';
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_taxable_allowances: number;
  non_taxable_allowances: number;
  is_active: boolean;
  hire_date: string | null;
  bank_name: string | null;
  bank_account: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  pay_period_month: number;
  pay_period_year: number;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_taxable_allowances: number;
  non_taxable_allowances: number;
  overtime_pay: number;
  bonus: number;
  gross_pay: number;
  taxable_income: number;
  paye: number;
  nssf_employee: number;
  nssf_employer: number;
  sha_deduction: number;
  housing_levy_employee: number;
  housing_levy_employer: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  personal_relief: number;
  insurance_relief: number;
  is_locked: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface EmployeeDeduction {
  id: string;
  employee_id: string;
  deduction_name: string;
  deduction_type: 'sacco' | 'loan' | 'advance' | 'insurance' | 'other';
  amount: number;
  is_recurring: boolean;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StatutoryRate {
  id: string;
  rate_type: string;
  rate_name: string;
  min_amount: number;
  max_amount: number | null;
  rate_value: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface P9FormData {
  employee: Employee;
  year: number;
  monthlyRecords: PayrollRecord[];
  totals: {
    grossPay: number;
    taxableIncome: number;
    paye: number;
    personalRelief: number;
    insuranceRelief: number;
    nssfEmployee: number;
  };
  employerInfo: {
    name: string;
    pin: string;
    address: string;
  };
}
