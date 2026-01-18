import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client, Payment } from '@/types/client';

// Cache tenant ID in memory to avoid repeated lookups
let cachedTenantId: string | null = null;
let tenantIdPromise: Promise<string | null> | null = null;

export const getCachedTenantId = async (): Promise<string | null> => {
  // Return cached value if available
  if (cachedTenantId !== null) {
    return cachedTenantId;
  }

  // If a fetch is already in progress, wait for it
  if (tenantIdPromise) {
    return tenantIdPromise;
  }

  // Start a new fetch
  tenantIdPromise = (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        cachedTenantId = null;
        return null;
      }

      const { data } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      cachedTenantId = data?.tenant_id || null;
      return cachedTenantId;
    } finally {
      tenantIdPromise = null;
    }
  })();

  return tenantIdPromise;
};

// Clear cache on logout
export const clearTenantCache = () => {
  cachedTenantId = null;
  tenantIdPromise = null;
};

// Listen for auth state changes to clear cache on logout
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    clearTenantCache();
  }
});

// Optimized fetch functions using cached tenant ID
const fetchClients = async (): Promise<Client[]> => {
  const tenantId = await getCachedTenantId();
  
  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

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

const fetchPayments = async (): Promise<Payment[]> => {
  const tenantId = await getCachedTenantId();
  
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

// Custom hooks with caching
export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const usePayments = () => {
  return useQuery({
    queryKey: ['payments'],
    queryFn: fetchPayments,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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
