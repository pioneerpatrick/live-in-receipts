import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle, X, History, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/supabaseStorage';
import { parseExcelData, ParsedClientData } from '@/lib/excelDataParser';
import { bulkImportWithPayments } from '@/lib/bulkImportWithPayments';

interface PaymentHistoryImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const PaymentHistoryImportDialog = ({ open, onClose, onImportComplete }: PaymentHistoryImportDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedClientData[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleClient = (index: number) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedClients(newExpanded);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false }) as any[][];

      if (jsonData.length < 2) {
        toast.error('Excel file is empty or has no data rows');
        setFile(null);
        setParsing(false);
        return;
      }

      // Use the specialized parser for payment history format
      const clients = parseExcelData(jsonData);
      
      setParsedData(clients);
      
      const totalPayments = clients.reduce((sum, c) => sum + c.payments.length, 0);
      toast.success(`Parsed ${clients.length} clients with ${totalPayments} payments`);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast.error('Failed to parse Excel file');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setImporting(true);
    try {
      const result = await bulkImportWithPayments(parsedData);
      
      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
        toast.warning(
          `Imported ${result.clientsImported} clients and ${result.paymentsImported} payments with ${result.errors.length} errors`
        );
      } else {
        toast.success(
          `Successfully imported ${result.clientsImported} clients and ${result.paymentsImported} payments!`
        );
      }
      
      onImportComplete();
      handleClose();
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setExpandedClients(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const totalPayments = parsedData.reduce((sum, c) => sum + c.payments.length, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Import Clients with Payment History
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file with client data and their payment history. The system will extract clients and all their payment records.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 sm:p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-base sm:text-lg font-medium mb-2">Drop your Excel file here</p>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">or click to browse</p>
              <Button variant="secondary">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Select Excel File
              </Button>
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Alert>
              <History className="h-4 w-4" />
              <AlertDescription>
                This import mode is designed for Excel files with payment history rows below each client.
                Each client row should be followed by their payment records.
              </AlertDescription>
            </Alert>
          </div>
        ) : parsing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Parsing Excel file...</p>
            <p className="text-sm text-muted-foreground">Extracting clients and payment history...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {parsedData.length} clients • {totalPayments} payments
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{parsedData.length}</p>
                <p className="text-xs text-muted-foreground">Clients</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                <p className="text-xl sm:text-2xl font-bold text-green-600">{totalPayments}</p>
                <p className="text-xs text-muted-foreground">Payments</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-50 dark:bg-purple-950 rounded-lg text-center">
                <p className="text-xl sm:text-2xl font-bold text-purple-600">
                  {parsedData.filter(c => c.client.status === 'completed').length}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="p-2 sm:p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-center">
                <p className="text-xl sm:text-2xl font-bold text-amber-600">
                  {parsedData.filter(c => c.client.status === 'ongoing').length}
                </p>
                <p className="text-xs text-muted-foreground">Ongoing</p>
              </div>
            </div>

            {/* Data Preview */}
            <div>
              <Label className="mb-2 block">Data Preview (click to expand payment history)</Label>
              <ScrollArea className="h-[350px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {parsedData.slice(0, 20).map((item, index) => (
                    <Collapsible key={index} open={expandedClients.has(index)}>
                      <CollapsibleTrigger asChild>
                        <div 
                          className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => toggleClient(index)}
                        >
                          <div className="flex items-center gap-3">
                            {expandedClients.has(index) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">{item.client.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.client.project_name} • Plot {item.client.plot_number}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatCurrency(item.client.total_price)}</p>
                              <p className="text-xs text-muted-foreground">
                                Paid: {formatCurrency(item.client.total_paid)}
                              </p>
                            </div>
                            <Badge variant={item.client.status === 'completed' ? 'default' : 
                                          item.client.status === 'cancelled' ? 'destructive' : 'secondary'}>
                              {item.client.status}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <History className="h-3 w-3" />
                              {item.payments.length}
                            </Badge>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {item.payments.length > 0 ? (
                          <div className="ml-8 mt-1 mb-2 p-3 bg-background border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[50px]">#</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                  <TableHead>Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {item.payments.map((payment, pIndex) => (
                                  <TableRow key={pIndex}>
                                    <TableCell className="text-muted-foreground">{pIndex + 1}</TableCell>
                                    <TableCell className="text-right font-medium text-primary">
                                      {formatCurrency(payment.amount)}
                                    </TableCell>
                                    <TableCell>{payment.payment_date || 'Not specified'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="ml-8 mt-1 mb-2 p-3 text-sm text-muted-foreground text-center bg-muted/20 rounded-lg">
                            No payment records found
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
              {parsedData.length > 20 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  ... and {parsedData.length - 20} more clients
                </p>
              )}
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Ready to import {parsedData.length} clients with {totalPayments} payment records.
                This will not modify existing records.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={importing} className="w-full sm:w-auto">
            Cancel
          </Button>
          {parsedData.length > 0 && (
            <Button onClick={handleImport} disabled={importing} className="w-full sm:w-auto">
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <span className="hidden sm:inline">Import {parsedData.length} Clients & {totalPayments} Payments</span>
              <span className="sm:hidden">Import {parsedData.length} Clients</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
