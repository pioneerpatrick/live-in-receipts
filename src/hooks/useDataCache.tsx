import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client, Payment } from '@/types/client';

// Optimized fetch functions
const fetchClients = async (): Promise<Client[]> => {
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

const fetchPayments = async (): Promise<Payment[]> => {
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

// Custom hooks with caching
export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 500,
  });
};

export const usePayments = () => {
  return useQuery({
    queryKey: ['payments'],
    queryFn: fetchPayments,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 500,
  });
};

// Combined hook for pages that need both
export const useClientsAndPayments = () => {
  const clientsQuery = useClients();
  const paymentsQuery = usePayments();

  return {
    clients: clientsQuery.data || [],
    payments: paymentsQuery.data || [],
    isLoading: clientsQuery.isLoading || paymentsQuery.isLoading,
    error: clientsQuery.error || paymentsQuery.error,
    refetch: async () => {
      await Promise.all([
        clientsQuery.refetch(),
        paymentsQuery.refetch(),
      ]);
    },
  };
};

// Hook to invalidate cache after mutations
export const useInvalidateData = () => {
  const queryClient = useQueryClient();
  
  const invalidateClients = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  }, [queryClient]);
  
  const invalidatePayments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['payments'] });
  }, [queryClient]);
  
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
  }, [queryClient]);
  
  return { invalidateClients, invalidatePayments, invalidateAll };
};

// Prefetch data for faster navigation
export const usePrefetchData = () => {
  const queryClient = useQueryClient();
  
  const prefetchClients = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['clients'],
      queryFn: fetchClients,
      staleTime: 30 * 1000,
    });
  }, [queryClient]);
  
  const prefetchPayments = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['payments'],
      queryFn: fetchPayments,
      staleTime: 30 * 1000,
    });
  }, [queryClient]);
  
  return { prefetchClients, prefetchPayments };
};
