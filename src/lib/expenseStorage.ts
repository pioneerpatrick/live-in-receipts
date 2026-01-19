import { supabase } from '@/integrations/supabase/client';
import { Expense } from '@/types/expense';

// Generate expense reference number
export const generateExpenseReference = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EXP-${year}${month}${day}-${random}`;
};

export const getExpenses = async (): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
  
  return (data || []) as Expense[];
};

export const addExpense = async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...expense,
      created_by: user?.id,
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
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('category', category)
    .order('expense_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching expenses by category:', error);
    throw error;
  }
  
  return (data || []) as Expense[];
};

export const getExpensesByDateRange = async (startDate: string, endDate: string): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching expenses by date range:', error);
    throw error;
  }
  
  return (data || []) as Expense[];
};
