import { supabase } from "@/integrations/supabase/client";
import { Employee, PayrollRecord, EmployeeDeduction, StatutoryRate } from "@/types/payroll";

// Generate employee ID
export const generateEmployeeId = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EMP-${year}${random}`;
};

// Get employee payroll records by year
export async function getEmployeePayrollRecords(employeeId: string, year?: number): Promise<PayrollRecord[]> {
  let query = supabase
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('pay_period_year', { ascending: false })
    .order('pay_period_month', { ascending: false });

  if (year !== undefined) {
    query = query.eq('pay_period_year', year);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as PayrollRecord[];
}

// Employee Operations
export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('full_name');

  if (error) throw error;
  return data as Employee[];
}

export async function getActiveEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .order('full_name');

  if (error) throw error;
  return data as Employee[];
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as Employee | null;
}

export async function addEmployee(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert({ ...employee })
    .select()
    .single();

  if (error) throw error;
  return data as Employee;
}

export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Employee;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Payroll Record Operations
export async function getPayrollRecords(year?: number, month?: number): Promise<PayrollRecord[]> {
  let query = supabase
    .from('payroll_records')
    .select(`
      *,
      employee:employees(id, full_name, employee_id, job_title, kra_pin)
    `)
    .order('created_at', { ascending: false });

  if (year !== undefined) {
    query = query.eq('pay_period_year', year);
  }
  if (month !== undefined) {
    query = query.eq('pay_period_month', month);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as PayrollRecord[];
}

export async function getPayrollRecordsByEmployee(employeeId: string): Promise<PayrollRecord[]> {
  const { data, error } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('pay_period_year', { ascending: false })
    .order('pay_period_month', { ascending: false });

  if (error) throw error;
  return data as PayrollRecord[];
}

export async function addPayrollRecord(record: Omit<PayrollRecord, 'id' | 'created_at' | 'updated_at'>): Promise<PayrollRecord> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('payroll_records')
    .insert({
      ...record,
      created_by: user?.id
    })
    .select()
    .single();

  if (error) throw error;
  return data as PayrollRecord;
}

export async function updatePayrollRecord(id: string, updates: Partial<PayrollRecord>): Promise<PayrollRecord> {
  const { data, error } = await supabase
    .from('payroll_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PayrollRecord;
}

export async function deletePayrollRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_records')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function approvePayrollRecord(id: string): Promise<PayrollRecord> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('payroll_records')
    .update({
      is_locked: true,
      approved_by: user?.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PayrollRecord;
}

// Employee Deduction Operations
export async function getEmployeeDeductions(employeeId: string): Promise<EmployeeDeduction[]> {
  const { data, error } = await supabase
    .from('employee_deductions')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as EmployeeDeduction[];
}

export async function getActiveDeductions(employeeId: string): Promise<EmployeeDeduction[]> {
  const { data, error } = await supabase
    .from('employee_deductions')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as EmployeeDeduction[];
}

export async function addDeduction(deduction: Omit<EmployeeDeduction, 'id' | 'created_at'>): Promise<EmployeeDeduction> {
  const { data, error } = await supabase
    .from('employee_deductions')
    .insert({ ...deduction })
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeDeduction;
}

export async function updateDeduction(id: string, updates: Partial<EmployeeDeduction>): Promise<EmployeeDeduction> {
  const { data, error } = await supabase
    .from('employee_deductions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeDeduction;
}

export async function deleteDeduction(id: string): Promise<void> {
  const { error } = await supabase
    .from('employee_deductions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Statutory Rate Operations
export async function getStatutoryRates(): Promise<StatutoryRate[]> {
  const { data, error } = await supabase
    .from('statutory_rates')
    .select('*')
    .eq('is_active', true)
    .order('rate_type')
    .order('min_amount', { ascending: true, nullsFirst: true });

  if (error) throw error;
  return data as StatutoryRate[];
}

export async function getAllStatutoryRates(): Promise<StatutoryRate[]> {
  const { data, error } = await supabase
    .from('statutory_rates')
    .select('*')
    .order('rate_type')
    .order('is_active', { ascending: false })
    .order('min_amount', { ascending: true, nullsFirst: true });

  if (error) throw error;
  return data as StatutoryRate[];
}

export async function addStatutoryRate(rate: Omit<StatutoryRate, 'id' | 'created_at' | 'updated_at'>): Promise<StatutoryRate> {
  const { data, error } = await supabase
    .from('statutory_rates')
    .insert({ ...rate })
    .select()
    .single();

  if (error) throw error;
  return data as StatutoryRate;
}

export async function updateStatutoryRate(id: string, updates: Partial<StatutoryRate>): Promise<StatutoryRate> {
  const { data, error } = await supabase
    .from('statutory_rates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as StatutoryRate;
}

export async function deleteStatutoryRate(id: string): Promise<void> {
  const { error } = await supabase
    .from('statutory_rates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
