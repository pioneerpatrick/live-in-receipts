import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
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
  Palette, Check, X, Eye, Settings, Shield, Activity
} from 'lucide-react';

interface TenantWithStats extends Tenant {
  user_count?: number;
  client_count?: number;
}

const SuperAdmin = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, isMainDomain, loading: tenantLoading } = useTenant();
  const { user } = useAuth();
  
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);

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
      fetchTenants();
    }
  }, [isSuperAdmin]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get stats for each tenant
      const tenantsWithStats = await Promise.all(
        (data || []).map(async (tenant) => {
          const [{ count: userCount }, { count: clientCount }] = await Promise.all([
            supabase.from('tenant_users').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
            supabase.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          ]);
          return {
            ...tenant,
            user_count: userCount || 0,
            client_count: clientCount || 0,
          } as TenantWithStats;
        })
      );

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
          <div className="flex gap-2">
            <Button onClick={fetchTenants} variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold">{totalTenants}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{activeTenants}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Globe className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                  <p className="text-2xl font-bold">{totalClients}</p>
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
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: tenant.primary_color }}
                          >
                            {tenant.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tenant.domain ? (
                          <a 
                            href={`https://${tenant.domain}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            {tenant.domain}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not configured</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                      <TableCell>{tenant.user_count || 0}</TableCell>
                      <TableCell>{tenant.client_count || 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tenant.subscription_plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(tenant)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {tenant.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusChange(tenant, 'suspended')}
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusChange(tenant, 'active')}
                            >
                              <Check className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No clients found. Click "Add Client" to create the first one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
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
    </div>
  );
};

export default SuperAdmin;
