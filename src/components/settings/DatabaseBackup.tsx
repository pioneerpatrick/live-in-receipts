import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, Loader2, Database, HardDrive, CheckCircle2 } from 'lucide-react';
import { generateDatabaseBackup, downloadBackup, getBackupStats, BackupData } from '@/lib/databaseBackup';
import { logActivity } from '@/lib/activityLogger';

export default function DatabaseBackup() {
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<BackupData | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof getBackupStats> | null>(null);

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
          tables: Object.keys(backupStats).filter(k => k !== 'total'),
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

  const handleDownloadAgain = () => {
    if (lastBackup) {
      downloadBackup(lastBackup);
      toast.success('Backup downloaded again');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Backup
            </CardTitle>
            <CardDescription>
              Create a complete backup of all your data to prevent data loss
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {lastBackup && (
              <Button variant="outline" onClick={handleDownloadAgain}>
                <Download className="w-4 h-4 mr-2" />
                Download Again
              </Button>
            )}
            <Button onClick={handleBackup} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <HardDrive className="w-4 h-4 mr-2" />
              )}
              Create Backup
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Backup Info */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="font-medium mb-2">What's included in the backup?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• All client records and payment history</li>
            <li>• Projects and plot inventory</li>
            <li>• Expenses and cancelled sales</li>
            <li>• Employee data and payroll records</li>
            <li>• Company settings and statutory rates</li>
            <li>• Recent activity logs (last 1000 entries)</li>
          </ul>
        </div>

        {/* Backup Stats */}
        {stats && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Last backup created successfully</span>
              <Badge variant="secondary" className="ml-auto">
                {lastBackup?.metadata.created_at && new Date(lastBackup.metadata.created_at).toLocaleString()}
              </Badge>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(stats)
                  .filter(([key]) => key !== 'total')
                  .map(([table, count]) => (
                    <TableRow key={table}>
                      <TableCell className="font-medium capitalize">
                        {table.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-right">{count as number}</TableCell>
                    </TableRow>
                  ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>Total Records</TableCell>
                  <TableCell className="text-right">{stats.total}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Warning */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">Recommendation</h4>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Create regular backups (weekly or monthly) and store them in a safe location. 
            The backup file is in JSON format and can be used to restore data if needed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
