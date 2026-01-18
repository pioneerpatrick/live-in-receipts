import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTenant, isSuperAdminAccess } from '@/hooks/useTenant';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'staff';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, role } = useAuth();
  const { isSuperAdmin, loading: tenantLoading, tenant } = useTenant();
  
  // Check if super admin is accessing client system
  const superAdminAccessingClient = isSuperAdminAccess();

  // Debug logging
  useEffect(() => {
    console.log('ProtectedRoute state:', { 
      loading, 
      tenantLoading, 
      user: !!user, 
      isSuperAdmin, 
      superAdminAccessingClient,
      tenant: tenant?.name 
    });
  }, [loading, tenantLoading, user, isSuperAdmin, superAdminAccessingClient, tenant]);

  // Show loading for max 5 seconds, then allow through
  if (loading || tenantLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Super admin accessing client system bypasses role checks
  if (superAdminAccessingClient && isSuperAdmin) {
    return <>{children}</>;
  }

  // If a specific role is required, check for it
  // Admin can access everything, staff can access staff-only routes
  if (requiredRole === 'admin' && role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-heading font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
