import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client, Payment } from '@/types/client';

// Cache tenant ID in memory to avoid repeated lookups
let cachedTenantId: string | null = null;
let tenantIdPromise: Promise<string | null> | null = null;
let lastTenantParam: string | null = null;

// Get tenant from URL parameter (for super admin access)
const getTenantFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tenant');
};

export const getCachedTenantId = async (): Promise<string | null> => {
  const tenantParam = getTenantFromUrl();
  
  // If tenant param changed, clear cache
  if (tenantParam !== lastTenantParam) {
    cachedTenantId = null;
    tenantIdPromise = null;
    lastTenantParam = tenantParam;
  }
  
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
      // If accessing via URL tenant parameter (super admin access)
      if (tenantParam) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id')
          .eq('domain', tenantParam)
          .maybeSingle();
        
        cachedTenantId = tenantData?.id || null;
        return cachedTenantId;
      }
      
      // Otherwise get from user's tenant association
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

// Clear cache on logout or tenant switch
export const clearTenantCache = () => {
  cachedTenantId = null;
  tenantIdPromise = null;
  lastTenantParam = null;
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

// Get stable query key that includes tenant context
const getQueryKeyWithTenant = (base: string) => {
  const tenantParam = getTenantFromUrl();
  return tenantParam ? [base, tenantParam] : [base];
};

// Custom hooks with caching
export const useClients = () => {
  const tenantParam = getTenantFromUrl();
  
  return useQuery({
    queryKey: ['clients', tenantParam],
    queryFn: fetchClients,
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 500,
  });
};

export const usePayments = () => {
  const tenantParam = getTenantFromUrl();
  
  return useQuery({
    queryKey: ['payments', tenantParam],
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
  const tenantParam = getTenantFromUrl();
  
  const invalidateClients = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['clients', tenantParam] });
  }, [queryClient, tenantParam]);
  
  const invalidatePayments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['payments', tenantParam] });
  }, [queryClient, tenantParam]);
  
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['clients', tenantParam] });
    queryClient.invalidateQueries({ queryKey: ['payments', tenantParam] });
  }, [queryClient, tenantParam]);
  
  return { invalidateClients, invalidatePayments, invalidateAll };
};

// Prefetch data for faster navigation
export const usePrefetchData = () => {
  const queryClient = useQueryClient();
  const tenantParam = getTenantFromUrl();
  
  const prefetchClients = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['clients', tenantParam],
      queryFn: fetchClients,
      staleTime: 30 * 1000,
    });
  }, [queryClient, tenantParam]);
  
  const prefetchPayments = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['payments', tenantParam],
      queryFn: fetchPayments,
      staleTime: 30 * 1000,
    });
  }, [queryClient, tenantParam]);
  
  return { prefetchClients, prefetchPayments };
};

// Prefetch for specific tenant (used when hovering over tenant links)
export const prefetchTenantData = async (tenantDomain: string) => {
  // Pre-resolve tenant ID
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('id')
    .eq('domain', tenantDomain)
    .maybeSingle();
  
  if (!tenantData?.id) return;
  
  // Prefetch clients and payments in parallel
  const [clientsResult, paymentsResult] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantData.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantData.id)
      .order('created_at', { ascending: false }),
  ]);
  
  return {
    clients: clientsResult.data || [],
    payments: paymentsResult.data || [],
    tenantId: tenantData.id,
  };
};
