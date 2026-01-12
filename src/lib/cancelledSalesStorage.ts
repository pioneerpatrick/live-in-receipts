import { supabase } from '@/integrations/supabase/client';
import { CancelledSale } from '@/types/cancelledSale';

export const getCancelledSales = async (): Promise<CancelledSale[]> => {
  const { data, error } = await supabase
    .from('cancelled_sales')
    .select('*')
    .order('cancellation_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching cancelled sales:', error);
    throw error;
  }
  
  return (data || []) as CancelledSale[];
};

export const addCancelledSale = async (
  sale: Omit<CancelledSale, 'id' | 'created_at' | 'updated_at' | 'cancelled_by'>
): Promise<CancelledSale> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('cancelled_sales')
    .insert({
      ...sale,
      cancelled_by: user?.id,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding cancelled sale:', error);
    throw error;
  }
  
  return data as CancelledSale;
};

export const updateCancelledSale = async (
  id: string, 
  updates: Partial<CancelledSale>
): Promise<CancelledSale> => {
  const { data, error } = await supabase
    .from('cancelled_sales')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating cancelled sale:', error);
    throw error;
  }
  
  return data as CancelledSale;
};

export const deleteCancelledSale = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('cancelled_sales')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting cancelled sale:', error);
    throw error;
  }
};
