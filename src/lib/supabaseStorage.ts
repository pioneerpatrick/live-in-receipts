import { supabase } from '@/integrations/supabase/client';
import { Client, Payment } from '@/types/client';

// Client operations
export const getClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
  
  return data || [];
};

export const addClient = async (client: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'percent_paid'>): Promise<Client> => {
  const { data, error } = await supabase
    .from('clients')
    .insert(client)
    .select()
    .single();
  
  if (error) {
    console.error('Error adding client:', error);
    throw error;
  }
  
  return data;
};

export const updateClient = async (id: string, updates: Partial<Client>): Promise<Client> => {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating client:', error);
    throw error;
  }
  
  return data;
};

export const deleteClient = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
};

// Payment operations
export const getPayments = async (): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
  
  return data || [];
};

export const addPayment = async (payment: Omit<Payment, 'id' | 'created_at' | 'created_by'>): Promise<Payment> => {
  // Get current user to set created_by
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...payment,
      created_by: user?.id,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding payment:', error);
    throw error;
  }
  
  return data;
};

export const updatePayment = async (id: string, updates: Partial<Payment>): Promise<Payment> => {
  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating payment:', error);
    throw error;
  }
  
  return data;
};

export const deletePayment = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
};

export const getClientPayments = async (clientId: string): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching client payments:', error);
    throw error;
  }
  
  return data || [];
};

// Utility functions
export const generateReceiptNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LIP-${year}${month}-${random}`;
};

export const formatCurrency = (amount: number): string => {
  // Validate the number to prevent displaying corrupted data
  const validAmount = typeof amount === 'number' && isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(validAmount);
};

// Bulk import clients (for Excel data) - percent_paid is calculated by DB trigger
export const bulkImportClients = async (clients: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'percent_paid'>[]): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('clients')
    .insert(clients)
    .select();
  
  if (error) {
    console.error('Error bulk importing clients:', error);
    throw error;
  }
  
  return data || [];
};
