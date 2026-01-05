import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AccountingDashboard } from '@/components/accounting/AccountingDashboard';
import { UserProfile, Client, Payment } from '@/types/client';
import { getClients, getPayments } from '@/lib/supabaseStorage';
import { logActivity, getActionLabel, ActivityAction } from '@/lib/activityLogger';
import { format } from 'date-fns';
import { 
  Shield, UserCog, Search, Crown, UserMinus, Trash2, BarChart3, 
  Activity, Building, Save, Loader2, Upload, X, Image, Users, Filter, RefreshCw 
} from 'lucide-react';

interface UserWithRole extends UserProfile {
  role?: 'admin' | 'staff';
}

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
}

interface CompanySettings {
  id: string;
  company_name: string;
  company_tagline: string | null;
  phone: string | null;
  email: string | null;
  email_secondary: string | null;
  social_handle: string | null;
  website: string | null;
  address: string | null;
  po_box: string | null;
  receipt_footer_message: string | null;
  receipt_watermark: string | null;
  logo_url: string | null;
}

const Admin = () => {
  const { role, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newRole, setNewRole] = useState<'admin' | 'staff'>('staff');
  const [timeRange, setTimeRange] = useState('all');
  
  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userStats, setUserStats] = useState({ total: 0, admins: 0, staff: 0 });
  
  // Company settings state
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (role === 'admin') {
      loadAllData();
    }
  }, [role]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      loadAccountingData(),
      fetchActivityLogs(),
      fetchUserStats(),
      fetchCompanySettings()
    ]);
    setLoading(false);
  };

  const loadAccountingData = async () => {
    try {
      const [clientsData, paymentsData] = await Promise.all([
        getClients(),
        getPayments()
      ]);
      setClients(clientsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error loading accounting data:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;
      
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;
      
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role as 'admin' | 'staff' | undefined,
        };
      });
      
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data: profiles } = await supabase.from('profiles').select('id');
      const { data: roles } = await supabase.from('user_roles').select('role');

      const admins = roles?.filter(r => r.role === 'admin').length || 0;
      const staff = roles?.filter(r => r.role === 'staff').length || 0;

      setUserStats({
        total: profiles?.length || 0,
        admins,
        staff,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setCompanySettings(data);
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    
    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', selectedUser.user_id)
        .maybeSingle();
      
      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', selectedUser.user_id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.user_id, role: newRole });
        
        if (error) throw error;
      }
      
      await logActivity({
        action: 'user_role_changed',
        entityType: 'user',
        entityId: selectedUser.user_id,
        details: { 
          user_name: selectedUser.full_name,
          new_role: newRole,
        },
      });
      
      toast.success(`User role updated to ${newRole}`);
      setRoleDialogOpen(false);
      fetchUsers();
      fetchUserStats();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setDeleting(true);
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: selectedUser.user_id },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      await logActivity({
        action: 'user_deleted',
        entityType: 'user',
        entityId: selectedUser.user_id,
        details: { user_name: selectedUser.full_name },
      });

      toast.success(`User ${selectedUser.full_name} deleted successfully`);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
      fetchUserStats();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!companySettings) return;
    
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({
          company_name: companySettings.company_name,
          company_tagline: companySettings.company_tagline,
          phone: companySettings.phone,
          email: companySettings.email,
          email_secondary: companySettings.email_secondary,
          social_handle: companySettings.social_handle,
          website: companySettings.website,
          address: companySettings.address,
          po_box: companySettings.po_box,
          receipt_footer_message: companySettings.receipt_footer_message,
          receipt_watermark: companySettings.receipt_watermark,
          logo_url: companySettings.logo_url,
        })
        .eq('id', companySettings.id);

      if (error) throw error;
      toast.success('Company settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !companySettings) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${Date.now()}.${fileExt}`;

      if (companySettings.logo_url) {
        const oldPath = companySettings.logo_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('company-logos').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      const newLogoUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ logo_url: newLogoUrl })
        .eq('id', companySettings.id);

      if (updateError) throw updateError;

      setCompanySettings({ ...companySettings, logo_url: newLogoUrl });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!companySettings?.logo_url) return;

    try {
      const oldPath = companySettings.logo_url.split('/').pop();
      if (oldPath) {
        await supabase.storage.from('company-logos').remove([oldPath]);
      }

      const { error } = await supabase
        .from('company_settings')
        .update({ logo_url: null })
        .eq('id', companySettings.id);

      if (error) throw error;

      setCompanySettings({ ...companySettings, logo_url: null });
      toast.success('Logo removed successfully');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Failed to remove logo');
    }
  };

  const updateSetting = (key: keyof CompanySettings, value: string) => {
    if (!companySettings) return;
    setCompanySettings({ ...companySettings, [key]: value });
  };

  const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (action.includes('deleted')) return 'destructive';
    if (action.includes('created') || action.includes('added')) return 'default';
    if (action.includes('login') || action.includes('logout')) return 'outline';
    return 'secondary';
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch = 
      log.user_name?.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(activitySearchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = [...new Set(activityLogs.map(log => log.action))];

  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage accounting, users, and settings</p>
            </div>
          </div>
          <Button onClick={loadAllData} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{userStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold">{userStats.admins}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <UserCog className="w-8 h-8 text-secondary" />
                <div>
                  <p className="text-sm text-muted-foreground">Staff</p>
                  <p className="text-2xl font-bold">{userStats.staff}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-accent-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Activities</p>
                  <p className="text-2xl font-bold">{activityLogs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="accounting" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="accounting" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Accounting</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Company</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          {/* Accounting Tab */}
          <TabsContent value="accounting">
            <AccountingDashboard 
              clients={clients}
              payments={payments}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage staff accounts and roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.full_name}</TableCell>
                              <TableCell>
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                  {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                                  {user.role || 'No role'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(user.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setNewRole(user.role || 'staff');
                                      setRoleDialogOpen(true);
                                    }}
                                  >
                                    {user.role === 'admin' ? (
                                      <>
                                        <UserMinus className="w-4 h-4 mr-1" />
                                        <span className="hidden sm:inline">Change</span>
                                      </>
                                    ) : (
                                      <>
                                        <Crown className="w-4 h-4 mr-1" />
                                        <span className="hidden sm:inline">Promote</span>
                                      </>
                                    )}
                                  </Button>
                                  {user.user_id !== currentUser?.id && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Settings Tab */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Company & Receipt Settings
                    </CardTitle>
                    <CardDescription>
                      Customize company details and receipt headers/footers
                    </CardDescription>
                  </div>
                  <Button onClick={handleSaveSettings} disabled={savingSettings || !companySettings}>
                    {savingSettings ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!companySettings ? (
                  <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
                ) : (
                  <>
                    {/* Company Logo */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Company Logo</h3>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {companySettings.logo_url ? (
                            <div className="relative">
                              <img
                                src={companySettings.logo_url}
                                alt="Company Logo"
                                className="w-24 h-24 object-contain border rounded-lg bg-muted"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 w-6 h-6"
                                onClick={handleRemoveLogo}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                              <Image className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingLogo}
                          >
                            {uploadingLogo ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            Upload Logo
                          </Button>
                          <p className="text-xs text-muted-foreground">Max 2MB, JPG/PNG</p>
                        </div>
                      </div>
                    </div>

                    {/* Company Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Company Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="company_name">Company Name</Label>
                          <Input
                            id="company_name"
                            value={companySettings.company_name}
                            onChange={(e) => updateSetting('company_name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company_tagline">Tagline</Label>
                          <Input
                            id="company_tagline"
                            value={companySettings.company_tagline || ''}
                            onChange={(e) => updateSetting('company_tagline', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={companySettings.phone || ''}
                            onChange={(e) => updateSetting('phone', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Primary Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={companySettings.email || ''}
                            onChange={(e) => updateSetting('email', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email_secondary">Secondary Email</Label>
                          <Input
                            id="email_secondary"
                            type="email"
                            value={companySettings.email_secondary || ''}
                            onChange={(e) => updateSetting('email_secondary', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            value={companySettings.website || ''}
                            onChange={(e) => updateSetting('website', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="social_handle">Social Handle</Label>
                          <Input
                            id="social_handle"
                            value={companySettings.social_handle || ''}
                            onChange={(e) => updateSetting('social_handle', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            value={companySettings.address || ''}
                            onChange={(e) => updateSetting('address', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="po_box">P.O. Box</Label>
                          <Input
                            id="po_box"
                            value={companySettings.po_box || ''}
                            onChange={(e) => updateSetting('po_box', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Receipt Customization */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Receipt Customization</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="receipt_footer_message">Footer Message</Label>
                          <Textarea
                            id="receipt_footer_message"
                            value={companySettings.receipt_footer_message || ''}
                            onChange={(e) => updateSetting('receipt_footer_message', e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="receipt_watermark">Watermark Text</Label>
                          <Input
                            id="receipt_watermark"
                            value={companySettings.receipt_watermark || ''}
                            onChange={(e) => updateSetting('receipt_watermark', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Activity Logs
                </CardTitle>
                <CardDescription>
                  Track all system activities and user actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                  <div className="relative flex-1 max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search activities..."
                      value={activitySearchTerm}
                      onChange={(e) => setActivitySearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      {uniqueActions.map(action => (
                        <SelectItem key={action} value={action}>
                          {getActionLabel(action as ActivityAction)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchActivityLogs}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead className="hidden sm:table-cell">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No activity logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {format(new Date(log.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="font-medium">
                              {log.user_name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getActionBadgeVariant(log.action)}>
                                {getActionLabel(log.action as ActivityAction)}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-xs truncate">
                              {log.details ? JSON.stringify(log.details).slice(0, 50) : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={newRole} onValueChange={(value: 'admin' | 'staff') => setNewRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedUser?.full_name}</span>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
