import { supabase } from '@/integrations/supabase/client';
import { Expense } from '@/types/expense';

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

export const getExpenses = async (): Promise<Expense[]> => {
  const tenantId = await getCurrentTenantId();
  
  let query = supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false });
  
  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
  
  return (data || []) as Expense[];
};

export const addExpense = async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = await getCurrentTenantId();
  
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...expense,
      created_by: user?.id,
      tenant_id: tenantId,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
  
  return data as Expense;
};

export const updateExpense = async (id: string, updates: Partial<Expense>): Promise<Expense> => {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
  
  return data as Expense;
};

export const deleteExpense = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

export const getExpensesByCategory = async (category: string): Promise<Expense[]> => {
  const tenantId = await getCurrentTenantId();
  
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('category', category)
    .order('expense_date', { ascending: false });
  
  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching expenses by category:', error);
    throw error;
  }
  
  return (data || []) as Expense[];
};

export const getCommissionPayouts = async (): Promise<Expense[]> => {
  const tenantId = await getCurrentTenantId();
  
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('is_commission_payout', true)
    .order('expense_date', { ascending: false });
  
  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching commission payouts:', error);
    throw error;
  }
  
  return (data || []) as Expense[];
};

export const generateExpenseReference = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EXP-${year}${month}-${random}`;
};
