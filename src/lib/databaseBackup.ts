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

export interface BackupSettings {
  id: string;
  auto_backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  last_backup_at: string | null;
  next_backup_at: string | null;
  retention_days: number;
}

export interface BackupHistoryItem {
  id: string;
  filename: string;
  file_path: string;
  file_size: number | null;
  backup_type: 'manual' | 'scheduled';
  status: 'completed' | 'failed';
  record_count: number | null;
  created_by: string | null;
  created_at: string;
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

export function validateBackupFile(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  
  const backup = data as Record<string, unknown>;
  
  // Check metadata exists
  if (!backup.metadata || typeof backup.metadata !== 'object') return false;
  
  // Check required arrays exist
  const requiredTables = ['clients', 'payments', 'projects', 'plots'];
  for (const table of requiredTables) {
    if (!Array.isArray(backup[table])) return false;
  }
  
  return true;
}

export async function restoreFromBackup(
  backup: BackupData,
  options: { 
    replaceExisting: boolean;
    tables?: string[];
  }
): Promise<{ success: boolean; restored: Record<string, number>; errors: string[] }> {
  const errors: string[] = [];
  const restored: Record<string, number> = {};
  
  const tablesToRestore = options.tables || [
    'projects',
    'plots', 
    'clients',
    'payments',
    'expenses',
    'cancelled_sales',
    'employees',
    'payroll_records',
    'employee_deductions',
    'statutory_rates',
    'company_settings',
  ];

  // Order matters for foreign key constraints
  const orderedTables = [
    'company_settings',
    'statutory_rates',
    'projects',
    'employees',
    'clients',
    'plots',
    'payments',
    'expenses',
    'cancelled_sales',
    'payroll_records',
    'employee_deductions',
  ].filter(t => tablesToRestore.includes(t));

  for (const table of orderedTables) {
    const tableData = backup[table as keyof BackupData];
    if (!Array.isArray(tableData) || tableData.length === 0) continue;

    try {
      if (options.replaceExisting) {
        // Delete existing data first - use type assertion for dynamic table access
        const { error: deleteError } = await (supabase.from(table as any).delete() as any).neq('id', '00000000-0000-0000-0000-000000000000');
        if (deleteError) {
          errors.push(`Failed to clear ${table}: ${deleteError.message}`);
          continue;
        }
      }

      // Insert data in batches of 100
      const batchSize = 100;
      let insertedCount = 0;
      
      for (let i = 0; i < tableData.length; i += batchSize) {
        const batch = tableData.slice(i, i + batchSize);
        
        // Remove auto-generated fields that might cause conflicts
        const cleanedBatch = batch.map((item: Record<string, unknown>) => {
          const cleaned = { ...item };
          // Keep ID for reference integrity
          return cleaned;
        });

        // Use type assertion for dynamic table access
        const { error: insertError } = await (supabase.from(table as any) as any)
          .upsert(cleanedBatch, { onConflict: 'id' });

        if (insertError) {
          errors.push(`Failed to restore ${table} batch: ${insertError.message}`);
        } else {
          insertedCount += batch.length;
        }
      }

      restored[table] = insertedCount;
    } catch (error) {
      errors.push(`Error restoring ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    success: errors.length === 0,
    restored,
    errors,
  };
}

export async function saveBackupToCloud(backup: BackupData): Promise<{ success: boolean; filename: string; error?: string }> {
  try {
    const now = new Date();
    const filename = `backup-${now.toISOString().split('T')[0]}-${now.getTime()}.json`;
    const filePath = `manual/${filename}`;

    const jsonBlob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });

    const { error: uploadError } = await supabase.storage
      .from('database-backups')
      .upload(filePath, jsonBlob, { contentType: 'application/json' });

    if (uploadError) {
      return { success: false, filename: '', error: uploadError.message };
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Record in history
    const stats = getBackupStats(backup);
    await supabase.from('backup_history').insert({
      filename,
      file_path: filePath,
      file_size: jsonBlob.size,
      backup_type: 'manual',
      status: 'completed',
      record_count: stats.total,
      created_by: user?.id,
    });

    return { success: true, filename };
  } catch (error) {
    return { success: false, filename: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getBackupSettings(): Promise<BackupSettings | null> {
  const { data, error } = await supabase
    .from('backup_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as BackupSettings;
}

export async function updateBackupSettings(settings: Partial<BackupSettings>): Promise<boolean> {
  const { data: existing } = await supabase
    .from('backup_settings')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('backup_settings')
      .update(settings)
      .eq('id', existing.id);
    return !error;
  } else {
    const { error } = await supabase
      .from('backup_settings')
      .insert(settings as BackupSettings);
    return !error;
  }
}

export async function getBackupHistory(): Promise<BackupHistoryItem[]> {
  const { data, error } = await supabase
    .from('backup_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return (data || []) as BackupHistoryItem[];
}

export async function deleteBackupFromCloud(item: BackupHistoryItem): Promise<boolean> {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('database-backups')
    .remove([item.file_path]);

  if (storageError) {
    console.error('Failed to delete backup file:', storageError);
  }

  // Delete from history
  const { error: historyError } = await supabase
    .from('backup_history')
    .delete()
    .eq('id', item.id);

  return !historyError;
}

export async function downloadBackupFromCloud(item: BackupHistoryItem): Promise<void> {
  const { data, error } = await supabase.storage
    .from('database-backups')
    .download(item.file_path);

  if (error || !data) {
    throw new Error('Failed to download backup');
  }

  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = item.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
