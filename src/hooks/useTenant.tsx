import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tenant } from '@/types/client';

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isMainDomain: boolean;
  setTenant: (tenant: Tenant | null) => void;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Main system domain (Technopanaly admin domain)
const MAIN_DOMAINS = [
  'technopanaly.lovable.app',
  'recieptsystem.technopanaly.co.ke',
  'live-inreciepts.lovable.app', // Legacy domain
];
const LOCALHOST_DOMAINS = ['localhost', '127.0.0.1'];

// Check if we're on the main admin domain
const isMainSystemDomain = (): boolean => {
  const hostname = window.location.hostname;
  
  // In development, localhost is treated as main domain for testing
  if (LOCALHOST_DOMAINS.includes(hostname)) {
    // Check URL parameter for tenant testing
    const urlParams = new URLSearchParams(window.location.search);
    const testTenant = urlParams.get('tenant');
    return !testTenant;
  }
  
  // Check for Lovable preview/project domains - treat as main domain unless tenant param present
  // This includes both lovableproject.com and lovable.app preview domains
  if (hostname.includes('lovableproject.com') || hostname.includes('lovable.app')) {
    const urlParams = new URLSearchParams(window.location.search);
    const testTenant = urlParams.get('tenant');
    return !testTenant;
  }
  
  // Check if it's one of the main admin domains
  return MAIN_DOMAINS.includes(hostname) || MAIN_DOMAINS.some(d => hostname === `www.${d}`);
};

// Check if current user is accessing as super admin
const isSuperAdminAccess = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  const result = urlParams.get('super_access') === 'true';
  return result;
};

// Get tenant domain from current URL
const getTenantDomain = (): string | null => {
  const hostname = window.location.hostname;
  const search = window.location.search;
  
  // Check for test tenant parameter first (used for super admin access in preview)
  const urlParams = new URLSearchParams(search);
  const testTenant = urlParams.get('tenant');
  
  if (testTenant) {
    console.log('Using tenant from URL param:', testTenant);
    return testTenant;
  }
  
  // Skip for localhost
  if (LOCALHOST_DOMAINS.includes(hostname)) {
    return null;
  }
  
  // Skip for main admin domains
  if (MAIN_DOMAINS.includes(hostname) || MAIN_DOMAINS.some(d => hostname === `www.${d}`)) {
    return null;
  }
  
  // Skip for Lovable preview/project domains (development)
  if (hostname.includes('lovableproject.com') || hostname.includes('lovable.app')) {
    return null;
  }
  
  // This is a client's custom domain - use it directly
  console.log('Using client domain:', hostname);
  return hostname;
};

// Export for use in auth components
export { isSuperAdminAccess };

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const isMainDomain = isMainSystemDomain();

  const checkSuperAdmin = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      setIsSuperAdmin(!!data);
    } catch (error) {
      console.error('Error checking super admin status:', error);
      setIsSuperAdmin(false);
    }
  };

  const fetchTenantByDomain = async (domain: string): Promise<Tenant | null> => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('domain', domain)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      return data as Tenant | null;
    } catch (error) {
      console.error('Error fetching tenant by domain:', error);
      return null;
    }
  };

  const fetchUserTenant = async (userId: string): Promise<Tenant | null> => {
    try {
      // Get user's tenant with single join query
      const { data: tenantUser, error: tuError } = await supabase
        .from('tenant_users')
        .select('tenant_id, tenants(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (tuError) throw tuError;
      if (!tenantUser?.tenants) return null;

      return tenantUser.tenants as unknown as Tenant;
    } catch (error) {
      console.error('Error fetching user tenant:', error);
      return null;
    }
  };

  const applyTenantBranding = (tenant: Tenant) => {
    // Apply tenant's brand colors to CSS variables
    const root = document.documentElement;
    
    if (tenant.primary_color) {
      const hsl = hexToHsl(tenant.primary_color);
      if (hsl) {
        root.style.setProperty('--primary', hsl);
      }
    }
    
    if (tenant.secondary_color) {
      const hsl = hexToHsl(tenant.secondary_color);
      if (hsl) {
        root.style.setProperty('--secondary', hsl);
      }
    }
    
    if (tenant.accent_color) {
      const hsl = hexToHsl(tenant.accent_color);
      if (hsl) {
        root.style.setProperty('--accent', hsl);
      }
    }
  };

  const hexToHsl = (hex: string): string | null => {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse hex
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const refreshTenant = async () => {
    // Always run if not initialized yet
    if (initialized) return;
    
    setLoading(true);
    try {
      // Run user fetch first (needed for other queries)
      const { data: { user } } = await supabase.auth.getUser();
      const domain = getTenantDomain();
      
      console.log('Tenant refresh - domain:', domain, 'isMainDomain:', isMainDomain, 'user:', !!user);
      
      // Build all promises upfront for maximum parallelism
      const promises: Promise<any>[] = [];
      
      // Tenant fetch - prioritize URL parameter domain
      let tenantPromise: Promise<Tenant | null> | null = null;
      if (domain) {
        // URL has tenant parameter - use it
        tenantPromise = fetchTenantByDomain(domain);
        promises.push(tenantPromise);
      } else if (user && !isMainDomain) {
        // No URL param and not main domain - fetch from user's tenant
        tenantPromise = fetchUserTenant(user.id);
        promises.push(tenantPromise);
      }
      
      // Super admin check - always run if user exists
      if (user) {
        promises.push(checkSuperAdmin(user.id));
      }
      
      // Execute all in parallel
      if (promises.length > 0) {
        await Promise.all(promises);
      }
      
      // Apply tenant if found
      if (tenantPromise) {
        const tenantData = await tenantPromise;
        console.log('Tenant data resolved:', tenantData?.name);
        if (tenantData) {
          setTenant(tenantData);
          applyTenantBranding(tenantData);
        }
      }
    } catch (error) {
      console.error('Error refreshing tenant:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  useEffect(() => {
    refreshTenant();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        setInitialized(false);
        refreshTenant();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantId: tenant?.id || null,
        loading,
        isSuperAdmin,
        isMainDomain,
        setTenant,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
