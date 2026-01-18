import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';

// Check if current user is accessing as super admin (standalone function)
const isSuperAdminAccess = (): boolean => {
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('super_access') === 'true';
};

const SuperAdminBackButton = () => {
  const tenantContext = useTenant();
  const isAccessingClient = isSuperAdminAccess();

  // Only show when super admin is viewing a client system (not on main domain)
  if (!tenantContext.isSuperAdmin || tenantContext.isMainDomain || !isAccessingClient) {
    return null;
  }

  const handleBackToAdmin = () => {
    // Navigate to the main domain without tenant parameter
    const mainUrl = window.location.origin.replace(/\?.*$/, '');
    window.location.href = mainUrl;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleBackToAdmin}
        className="gap-2 shadow-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-full"
        size="lg"
      >
        <Shield className="w-5 h-5" />
        <span className="hidden sm:inline">Back to Admin Console</span>
        <ArrowLeft className="w-5 h-5 sm:hidden" />
      </Button>
    </div>
  );
};

export default SuperAdminBackButton;