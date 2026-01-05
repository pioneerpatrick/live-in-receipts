import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Settings as SettingsIcon, Save, Loader2, Upload, X, Image } from 'lucide-react';

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
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (role === 'admin') {
      fetchCompanySettings();
    }
  }, [role]);

  const fetchCompanySettings = async () => {
    setLoading(true);
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
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
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
              <p className="text-sm text-muted-foreground">Manage company details and receipt customization</p>
            </div>
          </div>
        </div>

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
      </main>

      <Footer />
    </div>
  );
};

export default Settings;
