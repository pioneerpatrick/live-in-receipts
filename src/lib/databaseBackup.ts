import { supabase } from '@/integrations/supabase/client';

export interface BackupData {
  metadata: {
    created_at: string;
    version: string;
    tables: string[];
  };
  clients: any[];
  payments: any[];
  projects: any[];
  plots: any[];
  expenses: any[];
  cancelled_sales: any[];
  employees: any[];
  payroll_records: any[];
  employee_deductions: any[];
  statutory_rates: any[];
  company_settings: any[];
  activity_logs: any[];
}

export async function generateDatabaseBackup(): Promise<BackupData> {
  const tables = [
    'clients',
    'payments',
    'projects',
    'plots',
    'expenses',
    'cancelled_sales',
    'employees',
    'payroll_records',
    'employee_deductions',
    'statutory_rates',
    'company_settings',
    'activity_logs',
  ];

  // Fetch all data in parallel
  const [
    clientsRes,
    paymentsRes,
    projectsRes,
    plotsRes,
    expensesRes,
    cancelledSalesRes,
    employeesRes,
    payrollRecordsRes,
    employeeDeductionsRes,
    statutoryRatesRes,
    companySettingsRes,
    activityLogsRes,
  ] = await Promise.all([
    supabase.from('clients').select('*'),
    supabase.from('payments').select('*'),
    supabase.from('projects').select('*'),
    supabase.from('plots').select('*'),
    supabase.from('expenses').select('*'),
    supabase.from('cancelled_sales').select('*'),
    supabase.from('employees').select('*'),
    supabase.from('payroll_records').select('*'),
    supabase.from('employee_deductions').select('*'),
    supabase.from('statutory_rates').select('*'),
    supabase.from('company_settings').select('*'),
    supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(1000),
  ]);

  const backup: BackupData = {
    metadata: {
      created_at: new Date().toISOString(),
      version: '1.0',
      tables,
    },
    clients: clientsRes.data || [],
    payments: paymentsRes.data || [],
    projects: projectsRes.data || [],
    plots: plotsRes.data || [],
    expenses: expensesRes.data || [],
    cancelled_sales: cancelledSalesRes.data || [],
    employees: employeesRes.data || [],
    payroll_records: payrollRecordsRes.data || [],
    employee_deductions: employeeDeductionsRes.data || [],
    statutory_rates: statutoryRatesRes.data || [],
    company_settings: companySettingsRes.data || [],
    activity_logs: activityLogsRes.data || [],
  };

  return backup;
}

export function downloadBackup(backup: BackupData): void {
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `database-backup-${date}.json`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getBackupStats(backup: BackupData) {
  return {
    clients: backup.clients.length,
    payments: backup.payments.length,
    projects: backup.projects.length,
    plots: backup.plots.length,
    expenses: backup.expenses.length,
    cancelled_sales: backup.cancelled_sales.length,
    employees: backup.employees.length,
    payroll_records: backup.payroll_records.length,
    employee_deductions: backup.employee_deductions.length,
    statutory_rates: backup.statutory_rates.length,
    company_settings: backup.company_settings.length,
    activity_logs: backup.activity_logs.length,
    total: Object.values(backup).reduce((acc, val) => {
      if (Array.isArray(val)) return acc + val.length;
      return acc;
    }, 0),
  };
}
