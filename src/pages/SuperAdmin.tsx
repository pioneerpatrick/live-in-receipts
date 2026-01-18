import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { prefetchTenantData } from '@/hooks/useDataCache';

import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TenantUserManagement from '@/components/superadmin/TenantUserManagement';
import { DemoModeSection } from '@/components/superadmin/DemoModeSection';
import { TenantDashboardPreview } from '@/components/superadmin/TenantDashboardPreview';
import { initializeDemoTenant } from '@/lib/demoTenantSeeder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tenant } from '@/types/client';
import { 
  Building2, Plus, Edit, Trash2, RefreshCw, Users, Globe, 
  Check, X, Shield, Activity, ExternalLink, UserCog, Play, Eye
} from 'lucide-react';

interface TenantWithStats extends Tenant {
  user_count?: number;
  client_count?: number;
}

const SuperAdmin = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: tenantLoading } = useTenant();
  
  
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userManagementTenant, setUserManagementTenant] = useState<Tenant | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [previewTenant, setPreviewTenant] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'tenants' | 'demo'>('tenants');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    primary_color: '#0F172A',
    secondary_color: '#3B82F6',
    accent_color: '#10B981',
    contact_email: '',
    contact_phone: '',
    address: '',
    max_users: 10,
    subscription_plan: 'standard',
  });

  useEffect(() => {
    if (!tenantLoading && !isSuperAdmin) {
      toast.error('Access denied. Super admin privileges required.');
      navigate('/');
    }
  }, [isSuperAdmin, tenantLoading, navigate]);

  useEffect(() => {
    if (isSuperAdmin) {
      initializeDemoData();
    }
  }, [isSuperAdmin]);

  const initializeDemoData = async () => {
    try {
      const result = await initializeDemoTenant();
      if (result.created) {
        toast.success('Demo tenant created with sample data for presentations!');
      }
      await fetchTenants();
    } catch (error) {
      console.error('Error initializing demo tenant:', error);
      // Still fetch tenants even if demo creation fails
      await fetchTenants();
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel instead of N+1 queries
      const [tenantsResult, allUserCounts, allClientCounts] = await Promise.all([
        supabase
          .from('tenants')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('tenant_users')
          .select('tenant_id'),
        supabase
          .from('clients')
          .select('tenant_id'),
      ]);

      if (tenantsResult.error) throw tenantsResult.error;

      // Count users and clients per tenant efficiently in memory
      const userCountMap = new Map<string, number>();
      const clientCountMap = new Map<string, number>();

      (allUserCounts.data || []).forEach(tu => {
        userCountMap.set(tu.tenant_id, (userCountMap.get(tu.tenant_id) || 0) + 1);
      });

      (allClientCounts.data || []).forEach(c => {
        if (c.tenant_id) {
          clientCountMap.set(c.tenant_id, (clientCountMap.get(c.tenant_id) || 0) + 1);
        }
      });

      const tenantsWithStats = (tenantsResult.data || []).map(tenant => ({
        ...tenant,
        user_count: userCountMap.get(tenant.id) || 0,
        client_count: clientCountMap.get(tenant.id) || 0,
      })) as TenantWithStats[];

      setTenants(tenantsWithStats);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast.error('Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tenant?: Tenant) => {
    if (tenant) {
      setSelectedTenant(tenant);
      setFormData({
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain || '',
        primary_color: tenant.primary_color || '#0F172A',
        secondary_color: tenant.secondary_color || '#3B82F6',
        accent_color: tenant.accent_color || '#10B981',
        contact_email: tenant.contact_email || '',
        contact_phone: tenant.contact_phone || '',
        address: tenant.address || '',
        max_users: tenant.max_users || 10,
        subscription_plan: tenant.subscription_plan || 'standard',
      });
    } else {
      setSelectedTenant(null);
      setFormData({
        name: '',
        slug: '',
        domain: '',
        primary_color: '#0F172A',
        secondary_color: '#3B82F6',
        accent_color: '#10B981',
        contact_email: '',
        contact_phone: '',
        address: '',
        max_users: 10,
        subscription_plan: 'standard',
      });
    }
    setDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Name and slug are required');
      return;
    }

    setSaving(true);
    try {
      if (selectedTenant) {
        // Update existing tenant
        const { error } = await supabase
          .from('tenants')
          .update({
            name: formData.name,
            slug: formData.slug,
            domain: formData.domain || null,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            accent_color: formData.accent_color,
            contact_email: formData.contact_email || null,
            contact_phone: formData.contact_phone || null,
            address: formData.address || null,
            max_users: formData.max_users,
            subscription_plan: formData.subscription_plan,
          })
          .eq('id', selectedTenant.id);

        if (error) throw error;
        toast.success('Tenant updated successfully');
      } else {
        // Create new tenant with company_settings
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            name: formData.name,
            slug: formData.slug,
            domain: formData.domain || null,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            accent_color: formData.accent_color,
            contact_email: formData.contact_email || null,
            contact_phone: formData.contact_phone || null,
            address: formData.address || null,
            max_users: formData.max_users,
            subscription_plan: formData.subscription_plan,
            status: 'active',
          })
          .select()
          .single();

        if (tenantError) throw tenantError;

        // Create default company settings for the new tenant
        const { error: settingsError } = await supabase
          .from('company_settings')
          .insert({
            tenant_id: newTenant.id,
            company_name: formData.name,
            phone: formData.contact_phone || null,
            email: formData.contact_email || null,
            address: formData.address || null,
          });

        if (settingsError) {
          console.error('Error creating company settings:', settingsError);
        }

        toast.success('Tenant created successfully');
      }

      setDialogOpen(false);
      fetchTenants();
    } catch (error: any) {
      console.error('Error saving tenant:', error);
      toast.error(error.message || 'Failed to save tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (tenant: Tenant, newStatus: 'active' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ status: newStatus })
        .eq('id', tenant.id);

      if (error) throw error;
      toast.success(`Tenant ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      fetchTenants();
    } catch (error) {
      console.error('Error updating tenant status:', error);
      toast.error('Failed to update tenant status');
    }
  };

  const handleDelete = async () => {
    if (!selectedTenant) return;

    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', selectedTenant.id);

      if (error) throw error;
      toast.success('Tenant deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedTenant(null);
      fetchTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error('Failed to delete tenant. Ensure all related data is removed first.');
    }
  };

  // Prefetch tenant data on hover for instant loading
  const handlePrefetchTenant = useCallback((domain: string) => {
    // Fire and forget - don't await
    prefetchTenantData(domain).catch(() => {});
  }, []);

  const handleAccessClient = (tenant: Tenant) => {
    // Use production URL for shareable links (published app domain)
    const productionDomain = 'https://technopanalyrecieptsystem.lovable.app';
    
    let accessUrl: string;
    
    if (tenant.domain) {
      // If tenant has a custom domain configured, use it
      accessUrl = `https://${tenant.domain}`;
      console.log('Opening client custom domain:', accessUrl);
    } else {
      // No custom domain - use production domain with tenant slug parameter
      accessUrl = `${productionDomain}/?tenant=${tenant.slug}`;
      console.log('Opening client via production domain:', accessUrl);
    }
    
    // Copy to clipboard for easy sharing
    navigator.clipboard.writeText(accessUrl).then(() => {
      toast.success(`Link copied! Opening ${tenant.name}...`, {
        description: accessUrl,
        duration: 5000,
      });
    }).catch(() => {
      toast.success(`Opening ${tenant.name}`);
    });
    
    // Open in new tab
    const newWindow = window.open(accessUrl, '_blank');
    if (!newWindow) {
      // Fallback: show the URL for manual access
      toast.info(`Open this URL in a new browser tab: ${accessUrl}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDomainStatusIndicator = (tenant: TenantWithStats) => {
    // Truncate domain for display on smaller screens
    const truncateDomain = (domain: string) => {
      if (domain.length > 20) {
        return domain.substring(0, 18) + '...';
      }
      return domain;
    };

    if (!tenant.domain) {
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30 flex-shrink-0" />
          <span className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">Not set</span>
        </div>
      );
    }
    
    if (tenant.slug === 'demo-company') {
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span className="text-muted-foreground text-xs sm:text-sm italic whitespace-nowrap">Demo</span>
        </div>
      );
    }
    
    // Check if domain appears to be a custom domain (not lovable.app)
    const isCustomDomain = !tenant.domain.includes('lovable.app');
    
    if (isCustomDomain && tenant.status === 'active') {
      return (
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" title="Live & Verified" />
          <a 
            href={`https://${tenant.domain}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline text-xs sm:text-sm flex items-center gap-0.5 truncate max-w-[100px] sm:max-w-[150px] md:max-w-none"
            title={tenant.domain}
          >
            <span className="truncate">{truncateDomain(tenant.domain)}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
          <Badge className="bg-green-500/10 text-green-600 text-[10px] sm:text-xs border-green-500/20 flex-shrink-0 hidden sm:inline-flex">Live</Badge>
        </div>
      );
    }
    
    // Lovable subdomain or pending
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="Subdomain Active" />
        <a 
          href={`https://${tenant.domain}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px] md:max-w-none"
          title={tenant.domain}
        >
          {truncateDomain(tenant.domain)}
        </a>
        <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0 hidden sm:inline-flex">Sub</Badge>
      </div>
    );
  };

  // Overall stats
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const totalUsers = tenants.reduce((sum, t) => sum + (t.user_count || 0), 0);
  const totalClients = tenants.reduce((sum, t) => sum + (t.client_count || 0), 0);

  if (tenantLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Access Denied
              </CardTitle>
              <CardDescription>
                This page is only accessible to Technopanaly super administrators.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
                Technopanaly Admin
              </h1>
              <p className="text-sm text-muted-foreground">
                Multi-Tenant SaaS Management Console
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            <Button 
              onClick={() => setActiveTab('demo')} 
              variant={activeTab === 'demo' ? 'default' : 'outline'}
              className={`text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10 ${activeTab === 'demo' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Demo</span>
            </Button>
            <Button onClick={fetchTenants} variant="outline" disabled={loading} className="text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10">
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
            <Button onClick={() => handleOpenDialog()} className="text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10">
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Add</span> <span className="hidden sm:inline ml-1">Client</span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6">
          <Button 
            variant={activeTab === 'tenants' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('tenants')}
            className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
          >
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Clients</span>
          </Button>
          <Button 
            variant={activeTab === 'demo' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('demo')}
            className={`gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10 ${activeTab === 'demo' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
          >
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Demo</span>
          </Button>
        </div>

        {/* Demo Mode Tab */}
        {activeTab === 'demo' && (
          <DemoModeSection />
        )}

        {/* Tenants Tab */}
        {activeTab === 'tenants' && (
          <>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Clients</p>
                  <p className="text-lg sm:text-2xl font-bold">{totalTenants}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Active</p>
                  <p className="text-lg sm:text-2xl font-bold">{activeTenants}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Users</p>
                  <p className="text-lg sm:text-2xl font-bold">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Records</p>
                  <p className="text-lg sm:text-2xl font-bold">{totalClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Client Organizations
            </CardTitle>
            <CardDescription>
              Manage all client organizations and their configurations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap text-xs sm:text-sm">Client</TableHead>
                    <TableHead className="whitespace-nowrap text-xs sm:text-sm">Domain</TableHead>
                    <TableHead className="whitespace-nowrap text-xs sm:text-sm hidden sm:table-cell">Status</TableHead>
                    <TableHead className="whitespace-nowrap text-xs sm:text-sm hidden md:table-cell">Users</TableHead>
                    <TableHead className="whitespace-nowrap text-xs sm:text-sm hidden md:table-cell">Records</TableHead>
                    <TableHead className="whitespace-nowrap text-xs sm:text-sm hidden lg:table-cell">Plan</TableHead>
                    <TableHead className="text-right whitespace-nowrap text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id} className={tenant.slug === 'demo-company' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                      <TableCell className="py-2 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div 
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0"
                            style={{ backgroundColor: tenant.primary_color }}
                          >
                            {tenant.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <p className="font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">{tenant.name}</p>
                              {tenant.slug === 'demo-company' && (
                                <Badge className="bg-amber-500 text-[10px] sm:text-xs flex-shrink-0">Demo</Badge>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[80px] sm:max-w-none">{tenant.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4">
                        {getDomainStatusIndicator(tenant)}
                      </TableCell>
                      <TableCell className="py-2 sm:py-4 hidden sm:table-cell">{getStatusBadge(tenant.status)}</TableCell>
                      <TableCell className="py-2 sm:py-4 hidden md:table-cell text-xs sm:text-sm">{tenant.user_count || 0}</TableCell>
                      <TableCell className="py-2 sm:py-4 hidden md:table-cell text-xs sm:text-sm">{tenant.client_count || 0}</TableCell>
                      <TableCell className="py-2 sm:py-4 hidden lg:table-cell">
                        <Badge variant="outline" className="text-[10px] sm:text-xs">{tenant.subscription_plan}</Badge>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4">
                        <div className="flex justify-end gap-0.5 sm:gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-9 sm:w-9"
                            onClick={() => setPreviewTenant(tenant)}
                            title="Preview dashboard"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                          </Button>
                          {tenant.domain && tenant.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-9 sm:w-9 hidden xs:inline-flex"
                              onClick={() => handleAccessClient(tenant)}
                              onMouseEnter={() => tenant.domain && handlePrefetchTenant(tenant.domain)}
                              title="Access client system"
                            >
                              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-9 sm:w-9 hidden sm:inline-flex"
                            onClick={() => setUserManagementTenant(tenant)}
                            title="Manage users"
                          >
                            <UserCog className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-9 sm:w-9"
                            onClick={() => handleOpenDialog(tenant)}
                            title="Edit client"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                          {tenant.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-9 sm:w-9 hidden sm:inline-flex"
                              onClick={() => handleStatusChange(tenant, 'suspended')}
                              title="Suspend client"
                            >
                              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-9 sm:w-9 hidden sm:inline-flex"
                              onClick={() => handleStatusChange(tenant, 'active')}
                              title="Activate client"
                            >
                              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-9 sm:w-9"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete client"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">
                        No clients found. Click "Add Client" to create the first one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* User Management Section */}
        {userManagementTenant && (
          <div className="mt-6">
            <TenantUserManagement 
              tenant={userManagementTenant} 
              onClose={() => setUserManagementTenant(null)} 
            />
          </div>
        )}
        </>
        )}
      </main>

      <Footer />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedTenant ? 'Edit Client' : 'Add New Client'}
            </DialogTitle>
            <DialogDescription>
              {selectedTenant 
                ? 'Update client organization details and branding.'
                : 'Create a new client organization with their own domain and branding.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Client Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        name: e.target.value,
                        slug: selectedTenant ? formData.slug : generateSlug(e.target.value),
                      });
                    }}
                    placeholder="e.g., ABC Properties Ltd"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g., abc-properties"
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for this client (lowercase, no spaces)
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="domain">Custom Domain</Label>
                  <Input
                    id="domain"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="e.g., receipts.abcproperties.co.ke"
                  />
                  <p className="text-xs text-muted-foreground">
                    The domain where this client will access their system
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="admin@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contact_phone">Contact Phone</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="+254 700 000 000"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Physical address"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="branding" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      placeholder="#0F172A"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="accent_color">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent_color"
                      type="color"
                      value={formData.accent_color}
                      onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.accent_color}
                      onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                      placeholder="#10B981"
                    />
                  </div>
                </div>

                {/* Color Preview */}
                <div className="rounded-lg border p-4">
                  <Label className="mb-3 block">Preview</Label>
                  <div className="flex gap-4 items-center">
                    <div 
                      className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                      style={{ backgroundColor: formData.primary_color }}
                    >
                      {formData.name.charAt(0) || 'A'}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div 
                        className="px-4 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: formData.secondary_color }}
                      >
                        Secondary Button
                      </div>
                      <div 
                        className="px-4 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: formData.accent_color }}
                      >
                        Accent Element
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="max_users">Maximum Users</Label>
                  <Input
                    id="max_users"
                    type="number"
                    min={1}
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 10 })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="subscription_plan">Subscription Plan</Label>
                  <select
                    id="subscription_plan"
                    value={formData.subscription_plan}
                    onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {selectedTenant ? 'Update Client' : 'Create Client'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedTenant?.name}</strong> and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tenant Dashboard Preview */}
      {previewTenant && (
        <TenantDashboardPreview
          tenant={previewTenant}
          open={!!previewTenant}
          onClose={() => setPreviewTenant(null)}
        />
      )}
    </div>
  );
};

export default SuperAdmin;
