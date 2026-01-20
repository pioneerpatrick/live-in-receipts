import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Download, Loader2, Database, HardDrive, CheckCircle2, Upload, Cloud, Clock, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { 
  generateDatabaseBackup, 
  downloadBackup, 
  getBackupStats, 
  BackupData,
  validateBackupFile,
  restoreFromBackup,
  saveBackupToCloud,
  getBackupSettings,
  updateBackupSettings,
  getBackupHistory,
  deleteBackupFromCloud,
  downloadBackupFromCloud,
  BackupSettings,
  BackupHistoryItem 
} from '@/lib/databaseBackup';
import { logActivity } from '@/lib/activityLogger';
import { format } from 'date-fns';

export default function DatabaseBackup() {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [savingToCloud, setSavingToCloud] = useState(false);
  const [lastBackup, setLastBackup] = useState<BackupData | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof getBackupStats> | null>(null);
  
  // Restore state
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<BackupData | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // History state
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadSettings();
    loadHistory();
  }, []);

  const loadSettings = async () => {
    const data = await getBackupSettings();
    setSettings(data);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    const data = await getBackupHistory();
    setHistory(data);
    setLoadingHistory(false);
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const backup = await generateDatabaseBackup();
      const backupStats = getBackupStats(backup);
      
      setLastBackup(backup);
      setStats(backupStats);
      
      downloadBackup(backup);
      
      await logActivity({
        action: 'database_backup',
        entityType: 'system',
        details: { 
          total_records: backupStats.total,
          type: 'local_download',
        },
      });
      
      toast.success(`Backup downloaded with ${backupStats.total} records`);
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupToCloud = async () => {
    setSavingToCloud(true);
    try {
      const backup = await generateDatabaseBackup();
      const backupStats = getBackupStats(backup);
      
      const result = await saveBackupToCloud(backup);
      
      if (result.success) {
        await logActivity({
          action: 'database_backup',
          entityType: 'system',
          details: { 
            total_records: backupStats.total,
            type: 'cloud_storage',
            filename: result.filename,
          },
        });
        
        toast.success(`Backup saved to cloud: ${result.filename}`);
        loadHistory();
      } else {
        toast.error(result.error || 'Failed to save backup to cloud');
      }
    } catch (error) {
      console.error('Cloud backup error:', error);
      toast.error('Failed to save backup to cloud');
    } finally {
      setSavingToCloud(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!validateBackupFile(data)) {
        toast.error('Invalid backup file format');
        return;
      }

      setPendingRestore(data);
      setRestoreDialogOpen(true);
    } catch (error) {
      toast.error('Failed to read backup file');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRestore = async () => {
    if (!pendingRestore) return;

    setRestoring(true);
    try {
      const result = await restoreFromBackup(pendingRestore, { 
        replaceExisting 
      });

      if (result.success) {
        const totalRestored = Object.values(result.restored).reduce((a, b) => a + b, 0);
        toast.success(`Restored ${totalRestored} records successfully`);
        
        await logActivity({
          action: 'database_backup',
          entityType: 'system',
          details: { 
            type: 'restore',
            restored: result.restored,
            replace_existing: replaceExisting,
          },
        });
      } else {
        toast.error(`Restore completed with errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Failed to restore from backup');
    } finally {
      setRestoring(false);
      setRestoreDialogOpen(false);
      setPendingRestore(null);
    }
  };

  const handleSettingChange = async (key: keyof BackupSettings, value: any) => {
    if (!settings) return;
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    setSavingSettings(true);
    const success = await updateBackupSettings({ [key]: value });
    setSavingSettings(false);
    
    if (success) {
      toast.success('Settings updated');
    } else {
      toast.error('Failed to update settings');
    }
  };

  const handleDeleteBackup = async (item: BackupHistoryItem) => {
    const success = await deleteBackupFromCloud(item);
    if (success) {
      toast.success('Backup deleted');
      loadHistory();
    } else {
      toast.error('Failed to delete backup');
    }
  };

  const handleDownloadCloudBackup = async (item: BackupHistoryItem) => {
    try {
      await downloadBackupFromCloud(item);
      toast.success('Backup downloaded');
    } catch (error) {
      toast.error('Failed to download backup');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="backup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="restore" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Restore
          </TabsTrigger>
          <TabsTrigger value="cloud" className="flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Cloud Backups
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        {/* Backup Tab */}
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Create Backup
                  </CardTitle>
                  <CardDescription>
                    Download a complete backup of your database
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleBackupToCloud} disabled={savingToCloud}>
                    {savingToCloud ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Cloud className="w-4 h-4 mr-2" />
                    )}
                    Save to Cloud
                  </Button>
                  <Button onClick={handleBackup} disabled={loading}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download Backup
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="font-medium mb-2">What's included?</h4>
                <ul className="text-sm text-muted-foreground space-y-1 grid grid-cols-2 gap-1">
                  <li>• Clients & payments</li>
                  <li>• Projects & plots</li>
                  <li>• Expenses</li>
                  <li>• Cancelled sales</li>
                  <li>• Employees & payroll</li>
                  <li>• Company settings</li>
                </ul>
              </div>

              {stats && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Last backup: {stats.total} total records</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restore Tab */}
        <TabsContent value="restore">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Restore from Backup
                  </CardTitle>
                  <CardDescription>
                    Import a previously downloaded backup file to recover data
                  </CardDescription>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Select Backup File
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">Important</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Restoring a backup will modify your database. Make sure to create a current backup
                      before restoring to avoid data loss. You can choose to merge with or replace existing data.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cloud Backups Tab */}
        <TabsContent value="cloud">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    Cloud Backups
                  </CardTitle>
                  <CardDescription>
                    View and manage backups stored in cloud storage
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={loadHistory} disabled={loadingHistory}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No cloud backups found. Create one using "Save to Cloud" button.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.filename}</TableCell>
                          <TableCell>
                            <Badge variant={item.backup_type === 'scheduled' ? 'secondary' : 'outline'}>
                              {item.backup_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatFileSize(item.file_size)}</TableCell>
                          <TableCell>{item.record_count || '-'}</TableCell>
                          <TableCell>{format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadCloudBackup(item)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteBackup(item)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
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

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Automatic Backups
              </CardTitle>
              <CardDescription>
                Configure scheduled automatic backups to cloud storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Automatic Backups</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically create backups at scheduled intervals
                      </p>
                    </div>
                    <Switch
                      checked={settings.auto_backup_enabled}
                      onCheckedChange={(checked) => handleSettingChange('auto_backup_enabled', checked)}
                      disabled={savingSettings}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Backup Frequency</Label>
                    <Select
                      value={settings.backup_frequency}
                      onValueChange={(value) => handleSettingChange('backup_frequency', value)}
                      disabled={savingSettings || !settings.auto_backup_enabled}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Retention Period (days)</Label>
                    <Select
                      value={String(settings.retention_days)}
                      onValueChange={(value) => handleSettingChange('retention_days', parseInt(value))}
                      disabled={savingSettings || !settings.auto_backup_enabled}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Older backups will be automatically deleted
                    </p>
                  </div>

                  {settings.last_backup_at && (
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last backup:</span>
                        <span>{format(new Date(settings.last_backup_at), 'MMM d, yyyy HH:mm')}</span>
                      </div>
                      {settings.next_backup_at && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Next backup:</span>
                          <span>{format(new Date(settings.next_backup_at), 'MMM d, yyyy HH:mm')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from Backup</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to restore data from a backup file created on{' '}
                  <strong>
                    {pendingRestore?.metadata.created_at 
                      ? format(new Date(pendingRestore.metadata.created_at), 'MMM d, yyyy HH:mm')
                      : 'Unknown date'}
                  </strong>
                </p>
                
                {pendingRestore && (
                  <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Clients: {pendingRestore.clients?.length || 0}</div>
                      <div>Payments: {pendingRestore.payments?.length || 0}</div>
                      <div>Projects: {pendingRestore.projects?.length || 0}</div>
                      <div>Plots: {pendingRestore.plots?.length || 0}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    id="replace-existing"
                    checked={replaceExisting}
                    onCheckedChange={setReplaceExisting}
                  />
                  <Label htmlFor="replace-existing" className="font-normal">
                    Replace existing data (clear all before restore)
                  </Label>
                </div>

                {replaceExisting && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    ⚠️ This will delete all existing data before restoring. This action cannot be undone.
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoring}
              className={replaceExisting ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {restoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore Backup'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
