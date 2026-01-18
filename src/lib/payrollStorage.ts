import { supabase } from "@/integrations/supabase/client";
import { Employee, PayrollRecord, EmployeeDeduction, StatutoryRate } from "@/types/payroll";

// Helper to get current user's tenant_id
const getCurrentTenantId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return data?.tenant_id || null;
};

// Employee Operations
export async function getEmployees(): Promise<Employee[]> {
  const tenantId = await getCurrentTenantId();
  
  let query = supabase
    .from('employees')
    .select('*')
    .order('full_name');

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Employee[];
}

export async function getActiveEmployees(): Promise<Employee[]> {
  const tenantId = await getCurrentTenantId();
  
  let query = supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .order('full_name');

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;

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
  const tenantId = await getCurrentTenantId();
  
  const { data, error } = await supabase
    .from('employees')
    .insert({ ...employee, tenant_id: tenantId })
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
export async function getPayrollRecords(month?: number, year?: number): Promise<PayrollRecord[]> {
  const tenantId = await getCurrentTenantId();
  
  let query = supabase
    .from('payroll_records')
    .select('*, employee:employees(*)');

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }
  if (month !== undefined) {
    query = query.eq('pay_period_month', month);
  }
  if (year !== undefined) {
    query = query.eq('pay_period_year', year);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data as unknown as PayrollRecord[];
}

export async function getEmployeePayrollRecords(employeeId: string, year?: number): Promise<PayrollRecord[]> {
  let query = supabase
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employeeId);

  if (year !== undefined) {
    query = query.eq('pay_period_year', year);
  }

  const { data, error } = await query.order('pay_period_month');

  if (error) throw error;
  return data as PayrollRecord[];
}

export async function addPayrollRecord(record: Omit<PayrollRecord, 'id' | 'created_at' | 'updated_at' | 'employee'>): Promise<PayrollRecord> {
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = await getCurrentTenantId();
  
  const { data, error } = await supabase
    .from('payroll_records')
    .insert({ ...record, created_by: user?.id, tenant_id: tenantId })
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

export async function lockPayrollRecord(id: string): Promise<PayrollRecord> {
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

// Employee Deductions Operations
export async function getEmployeeDeductions(employeeId: string): Promise<EmployeeDeduction[]> {
  const { data, error } = await supabase
    .from('employee_deductions')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .order('deduction_name');

  if (error) throw error;
  return data as EmployeeDeduction[];
}

export async function addEmployeeDeduction(deduction: Omit<EmployeeDeduction, 'id' | 'created_at'>): Promise<EmployeeDeduction> {
  const tenantId = await getCurrentTenantId();
  
  const { data, error } = await supabase
    .from('employee_deductions')
    .insert({ ...deduction, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeDeduction;
}

export async function updateEmployeeDeduction(id: string, updates: Partial<EmployeeDeduction>): Promise<EmployeeDeduction> {
  const { data, error } = await supabase
    .from('employee_deductions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EmployeeDeduction;
}

export async function deleteEmployeeDeduction(id: string): Promise<void> {
  const { error } = await supabase
    .from('employee_deductions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Statutory Rates Operations
export async function getStatutoryRates(): Promise<StatutoryRate[]> {
  const tenantId = await getCurrentTenantId();
  
  let query = supabase
    .from('statutory_rates')
    .select('*')
    .eq('is_active', true)
    .order('rate_type', { ascending: true });

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as StatutoryRate[];
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

// Generate unique employee ID
export function generateEmployeeId(): string {
  const prefix = 'EMP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}
