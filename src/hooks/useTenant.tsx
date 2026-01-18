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
const MAIN_DOMAIN = 'recieptsystem.technopanaly.co.ke';
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
  
  // Check for Lovable preview domains - treat as main domain unless tenant param present
  if (hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
    const urlParams = new URLSearchParams(window.location.search);
    const testTenant = urlParams.get('tenant');
    return !testTenant;
  }
  
  return hostname === MAIN_DOMAIN || hostname === `www.${MAIN_DOMAIN}`;
};

// Check if current user is accessing as super admin
const isSuperAdminAccess = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('super_access') === 'true';
};

// Get tenant domain from current URL
const getTenantDomain = (): string | null => {
  const hostname = window.location.hostname;
  
  // Check for test tenant parameter first (used for super admin access)
  const urlParams = new URLSearchParams(window.location.search);
  const testTenant = urlParams.get('tenant');
  if (testTenant) {
    return testTenant;
  }
  
  // Skip for localhost and main domain
  if (LOCALHOST_DOMAINS.includes(hostname) || isMainSystemDomain()) {
    return null;
  }
  
  // Skip for Lovable preview domains without tenant param
  if (hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
    return null;
  }
  
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

  const fetchTenantByDomain = async (domain: string) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('domain', domain)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setTenant(data as Tenant);
        applyTenantBranding(data as Tenant);
      }
    } catch (error) {
      console.error('Error fetching tenant by domain:', error);
    }
  };

  const fetchUserTenant = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's tenant
      const { data: tenantUser, error: tuError } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (tuError) throw tuError;
      if (!tenantUser) return;

      // Get tenant details
      const { data: tenantData, error: tError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantUser.tenant_id)
        .maybeSingle();

      if (tError) throw tError;
      
      if (tenantData) {
        setTenant(tenantData as Tenant);
        applyTenantBranding(tenantData as Tenant);
      }
    } catch (error) {
      console.error('Error fetching user tenant:', error);
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
    if (initialized && !loading) return; // Prevent duplicate calls
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const domain = getTenantDomain();
      
      // Run domain/tenant fetch and super admin check in parallel
      const promises: Promise<void>[] = [];
      
      if (domain) {
        promises.push(fetchTenantByDomain(domain));
      } else if (!isMainDomain && user) {
        promises.push(fetchUserTenant());
      }
      
      if (user) {
        promises.push(checkSuperAdmin(user.id));
      }
      
      await Promise.all(promises);
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
