import { supabase } from '@/integrations/supabase/client';
import { Client, Payment } from '@/types/client';

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

// Client operations
export const getClients = async (): Promise<Client[]> => {
  const tenantId = await getCurrentTenantId();
  
  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  // Filter by tenant if user belongs to one
  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
  
  return data || [];
};

export const addClient = async (client: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'percent_paid' | 'created_by' | 'tenant_id'>): Promise<Client> => {
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = await getCurrentTenantId();
  
  const { data, error } = await supabase
    .from('clients')
    .insert({
      ...client,
      created_by: user?.id,
      tenant_id: tenantId,
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
  }

  // Delete related cancelled sales records
  const { error: cancelledSalesError } = await supabase
    .from('cancelled_sales')
    .delete()
    .eq('client_id', id);

  if (cancelledSalesError) {
    console.error('Error deleting cancelled sales:', cancelledSalesError);
  }

  // Delete related payments
  const { error: paymentsError } = await supabase
    .from('payments')
    .delete()
    .eq('client_id', id);

  if (paymentsError) {
    console.error('Error deleting payments:', paymentsError);
  }

  // Update expenses to unlink from client
  const { error: expensesError } = await supabase
    .from('expenses')
    .update({ client_id: null })
    .eq('client_id', id);

  if (expensesError) {
    console.error('Error unlinking expenses:', expensesError);
  }

  // Delete the client
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
  const tenantId = await getCurrentTenantId();
  
  let query = supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
  
  return data || [];
};

export const addPayment = async (payment: Omit<Payment, 'id' | 'created_at' | 'created_by' | 'tenant_id'>): Promise<Payment> => {
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = await getCurrentTenantId();
  
  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...payment,
      created_by: user?.id,
      tenant_id: tenantId,
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

// Return plot to available status
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
export const generateReceiptNumber = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  const secs = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  
  return `RCT-${year}${month}${day}-${hours}${mins}${secs}${ms}`;
};

export const formatCurrency = (amount: number): string => {
  const validAmount = typeof amount === 'number' && isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(validAmount);
};

// Bulk import clients
export const bulkImportClients = async (clients: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'percent_paid' | 'created_by' | 'tenant_id'>[]): Promise<Client[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = await getCurrentTenantId();
  
  const clientsWithMetadata = clients.map(client => ({
    ...client,
    created_by: user?.id,
    tenant_id: tenantId,
  }));
  
  const { data, error } = await supabase
    .from('clients')
    .insert(clientsWithMetadata)
    .select();
  
  if (error) {
    console.error('Error bulk importing clients:', error);
    throw error;
  }
  
  return data || [];
};
