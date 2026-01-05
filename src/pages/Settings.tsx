import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Activity, Users, RefreshCw, Search, Filter, Building, Home, Save, Loader2, Upload, X, Image } from 'lucide-react';
import { getActionLabel, ActivityAction } from '@/lib/activityLogger';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

const Settings = () => {
  const { role } = useAuth();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userStats, setUserStats] = useState({ total: 0, admins: 0, staff: 0 });
  
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (role === 'admin') {
      fetchActivityLogs();
      fetchUserStats();
      fetchCompanySettings();
    }
  }, [role]);

  const fetchActivityLogs = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${Date.now()}.${fileExt}`;

      // Delete old logo if exists
      if (companySettings.logo_url) {
        const oldPath = companySettings.logo_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('company-logos').remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      const newLogoUrl = urlData.publicUrl;

      // Update company settings with new logo URL
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

  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch = 
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
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
            <CardDescription>Only administrators can access settings.</CardDescription>
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
            <SettingsIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">System settings and activity logs</p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="company" className="space-y-4">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Company</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4">
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

                    {/* Receipt Settings */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Receipt Customization</h3>
                      <div className="space-y-4">
                        {/* Logo Upload */}
                        <div className="space-y-2">
                          <Label>Company Logo</Label>
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
                            <div className="flex-1 space-y-2">
                              <input
                                type="file"
                                ref={fileInputRef}
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
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Logo
                                  </>
                                )}
                              </Button>
                              <p className="text-xs text-muted-foreground">
                                Recommended: Square image, max 2MB. Will appear on receipts.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="receipt_watermark">Receipt Watermark Text</Label>
                          <Input
                            id="receipt_watermark"
                            value={companySettings.receipt_watermark || ''}
                            onChange={(e) => updateSetting('receipt_watermark', e.target.value)}
                            placeholder="Text shown as watermark on receipts"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="receipt_footer_message">Receipt Footer Message</Label>
                          <Textarea
                            id="receipt_footer_message"
                            value={companySettings.receipt_footer_message || ''}
                            onChange={(e) => updateSetting('receipt_footer_message', e.target.value)}
                            placeholder="Thank you message shown at the bottom of receipts"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Activity Logs
                    </CardTitle>
                    <CardDescription>
                      Track all user actions in the system
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchActivityLogs}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by user or action..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger className="w-[180px]">
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
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading activity logs...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No activity logs found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead className="hidden sm:table-cell">Details</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">
                              {log.user_name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getActionBadgeVariant(log.action)}>
                                {getActionLabel(log.action as ActivityAction)}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell max-w-[200px] truncate">
                              {log.details ? (
                                <span className="text-sm text-muted-foreground">
                                  {log.entity_type && <span className="capitalize">{log.entity_type}: </span>}
                                  {log.details.name || log.details.client_name || JSON.stringify(log.details).slice(0, 50)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {format(new Date(log.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{userStats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Admins</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-secondary">{userStats.admins}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Staff</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-muted-foreground">{userStats.staff}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Basic system configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Application</p>
                    <p className="font-medium">Live-In Properties CRM</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Version</p>
                    <p className="font-medium">1.0.0</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Environment</p>
                    <p className="font-medium">Production</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{format(new Date(), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Settings;