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

export const addClient = async (client: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'percent_paid' | 'created_by'>): Promise<Client> => {
  // Get current user to set created_by
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('clients')
    .insert({
      ...client,
      created_by: user?.id,
    })
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
  // First, return any plots associated with this client back to available
  const { error: plotError } = await supabase
    .from('plots')
    .update({ 
      status: 'available', 
      client_id: null, 
      sold_at: null 
    })
    .eq('client_id', id);

  if (plotError) {
    console.error('Error returning plot to stock:', plotError);
    // Continue with client deletion even if plot update fails
  }

  // Then delete the client
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
  const { error, count } = await supabase
    .from('payments')
    .delete({ count: 'exact' })
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
  
  // Check if deletion actually occurred (RLS might silently block it)
  if (count === 0) {
    throw new Error('Payment deletion failed - insufficient permissions or payment not found');
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

// Return plot to available status when client has no payments
export const returnPlotToStock = async (clientId: string): Promise<void> => {
  const { error } = await supabase
    .from('plots')
    .update({ 
      status: 'available', 
      client_id: null, 
      sold_at: null 
    })
    .eq('client_id', clientId);

  if (error) {
    console.error('Error returning plot to stock:', error);
    throw error;
  }
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
export const bulkImportClients = async (clients: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'percent_paid' | 'created_by'>[]): Promise<Client[]> => {
  // Get current user to set created_by
  const { data: { user } } = await supabase.auth.getUser();
  
  const clientsWithCreator = clients.map(client => ({
    ...client,
    created_by: user?.id,
  }));
  
  const { data, error } = await supabase
    .from('clients')
    .insert(clientsWithCreator)
    .select();
  
  if (error) {
    console.error('Error bulk importing clients:', error);
    throw error;
  }
  
  return data || [];
};
