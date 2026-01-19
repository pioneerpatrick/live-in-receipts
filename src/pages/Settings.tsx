import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { UserProfile } from '@/types/client';
import { logActivity, getActionLabel, ActivityAction } from '@/lib/activityLogger';
import { format } from 'date-fns';
import { 
  Settings as SettingsIcon, Save, Loader2, Upload, X, Image, 
  UserCog, Activity, UserMinus, Trash2, Search, Filter, RefreshCw, Building, Users, Calculator, KeyRound, Crown
} from 'lucide-react';
import StatutoryRatesManager from '@/components/payroll/StatutoryRatesManager';

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
  signature_url: string | null;
  production_url: string | null;
}

const Settings = () => {
  const { role, user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Company settings state
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Users state
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff'>('staff');
  const [userStats, setUserStats] = useState({ total: 0, admins: 0, staff: 0 });

  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    if (role === 'admin') {
      loadAllData();
    }
  }, [role]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchCompanySettings(),
      fetchUsers(),
      fetchActivityLogs(),
      fetchUserStats()
    ]);
    setLoading(false);
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
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id');
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role');

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
          production_url: companySettings.production_url,
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
      const fileName = `company/logo-${Date.now()}.${fileExt}`;

      if (companySettings.logo_url) {
        const urlParts = companySettings.logo_url.split('/company-logos/');
        if (urlParts.length > 1) {
          const oldPath = urlParts[1];
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
      const urlParts = companySettings.logo_url.split('/company-logos/');
      if (urlParts.length > 1) {
        const oldPath = urlParts[1];
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

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !companySettings) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Signature must be less than 2MB');
      return;
    }

    setUploadingSignature(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company/signature-${Date.now()}.${fileExt}`;

      if (companySettings.signature_url) {
        const urlParts = companySettings.signature_url.split('/company-logos/');
        if (urlParts.length > 1) {
          const oldPath = urlParts[1];
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

      const newSignatureUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ signature_url: newSignatureUrl })
        .eq('id', companySettings.id);

      if (updateError) throw updateError;

      setCompanySettings({ ...companySettings, signature_url: newSignatureUrl });
      toast.success('Signature uploaded successfully');
    } catch (error) {
      console.error('Error uploading signature:', error);
      toast.error('Failed to upload signature');
    } finally {
      setUploadingSignature(false);
      if (signatureInputRef.current) {
        signatureInputRef.current.value = '';
      }
    }
  };

  const handleRemoveSignature = async () => {
    if (!companySettings?.signature_url) return;

    try {
      const urlParts = companySettings.signature_url.split('/company-logos/');
      if (urlParts.length > 1) {
        const oldPath = urlParts[1];
        await supabase.storage.from('company-logos').remove([oldPath]);
      }

      const { error } = await supabase
        .from('company_settings')
        .update({ signature_url: null })
        .eq('id', companySettings.id);

      if (error) throw error;

      setCompanySettings({ ...companySettings, signature_url: null });
      toast.success('Signature removed successfully');
    } catch (error) {
      console.error('Error removing signature:', error);
      toast.error('Failed to remove signature');
    }
  };

  const updateSetting = (key: keyof CompanySettings, value: string) => {
    if (!companySettings) return;
    setCompanySettings({ ...companySettings, [key]: value });
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

  const handlePasswordReset = async () => {
    if (!selectedUser) return;
    
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setResettingPassword(true);
    try {
      const response = await supabase.functions.invoke('reset-user-password', {
        body: { userId: selectedUser.user_id, newPassword },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      await logActivity({
        action: 'password_reset',
        entityType: 'user',
        entityId: selectedUser.user_id,
        details: { user_name: selectedUser.full_name },
      });

      toast.success(`Password reset successfully for ${selectedUser.full_name}`);
      setPasswordResetDialogOpen(false);
      setSelectedUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
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
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Access Denied</CardTitle>
              <CardDescription>Only administrators can access settings.</CardDescription>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage company, users, and activity logs</p>
            </div>
          </div>
          <Button onClick={loadAllData} variant="outline" className="flex items-center gap-2" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
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
                <Activity className="w-8 h-8 text-secondary" />
                <div>
                  <p className="text-sm text-muted-foreground">Activities</p>
                  <p className="text-2xl font-bold">{activityLogs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Company</span>
            </TabsTrigger>
            <TabsTrigger value="statutory" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Statutory Rates</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          {/* Company Settings Tab */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
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
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : !companySettings ? (
                  <div className="text-center py-8 text-muted-foreground">No settings found</div>
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

                    {/* Company Signature */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Authorized Signature</h3>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {companySettings.signature_url ? (
                            <div className="relative">
                              <img
                                src={companySettings.signature_url}
                                alt="Authorized Signature"
                                className="w-32 h-16 object-contain border rounded-lg bg-muted"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 w-6 h-6"
                                onClick={handleRemoveSignature}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="w-32 h-16 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                              <Image className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <input
                            ref={signatureInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleSignatureUpload}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            onClick={() => signatureInputRef.current?.click()}
                            disabled={uploadingSignature}
                          >
                            {uploadingSignature ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            Upload Signature
                          </Button>
                          <p className="text-xs text-muted-foreground">Max 2MB, JPG/PNG (for receipts)</p>
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
                          <Label htmlFor="production_url">Production URL (for All System Links)</Label>
                          <Input
                            id="production_url"
                            placeholder="https://your-domain.com"
                            value={companySettings.production_url || ''}
                            onChange={(e) => updateSetting('production_url', e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            This URL will be used for all system links including QR codes, WhatsApp payment links, and any shared URLs. Set this to your custom domain if hosting elsewhere.
                          </p>
                        </div>
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

          {/* Statutory Rates Tab */}
          <TabsContent value="statutory">
            <StatutoryRatesManager />
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
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    {/* Mobile Card View */}
                    <div className="block md:hidden space-y-2 px-4">
                      {filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No users found</div>
                      ) : (
                        filteredUsers.map((user) => (
                          <div key={user.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Joined {new Date(user.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                                {user.role || 'No role'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border/50">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewRole(user.role || 'staff');
                                  setRoleDialogOpen(true);
                                }}
                              >
                                {user.role === 'admin' ? 'Change Role' : 'Promote'}
                              </Button>
                              {user.user_id !== currentUser?.id && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setNewPassword('');
                                      setConfirmPassword('');
                                      setPasswordResetDialogOpen(true);
                                    }}
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </Button>
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
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block px-4 sm:px-0">
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
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedUser(user);
                                            setNewPassword('');
                                            setConfirmPassword('');
                                            setPasswordResetDialogOpen(true);
                                          }}
                                          title="Reset Password"
                                        >
                                          <KeyRound className="w-4 h-4" />
                                        </Button>
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
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
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

                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  {/* Mobile Card View */}
                  <div className="block md:hidden space-y-2 px-4">
                    {filteredLogs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No activity logs found</div>
                    ) : (
                      filteredLogs.map((log) => (
                        <div key={log.id} className="bg-muted/30 rounded-lg p-3 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm">{log.user_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), 'MMM d, HH:mm')}
                              </p>
                            </div>
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {getActionLabel(log.action as ActivityAction)}
                            </Badge>
                          </div>
                          {log.details && (
                            <p className="text-xs text-muted-foreground truncate pt-1">
                              {JSON.stringify(log.details).slice(0, 60)}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block px-4 sm:px-0">
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

      {/* Password Reset Dialog */}
      <Dialog open={passwordResetDialogOpen} onOpenChange={setPasswordResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <span className="font-semibold">{selectedUser?.full_name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
            {newPassword && newPassword.length < 6 && (
              <p className="text-sm text-destructive">Password must be at least 6 characters</p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordReset}
              disabled={resettingPassword || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
            >
              {resettingPassword ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4 mr-2" />
              )}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
