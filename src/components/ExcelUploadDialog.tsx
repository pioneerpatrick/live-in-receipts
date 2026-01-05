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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle, X, History } from 'lucide-react';
import { toast } from 'sonner';
import { bulkImportClients, formatCurrency } from '@/lib/supabaseStorage';
import { Client } from '@/types/client';
import { parseExcelData, ParsedClientData } from '@/lib/excelDataParser';
import { bulkImportWithPayments } from '@/lib/bulkImportWithPayments';

interface ExcelUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type ClientImport = Omit<Client, 'id' | 'created_at' | 'updated_at' | 'percent_paid'>;

// Column mapping from Excel headers to database fields
const COLUMN_MAPPING: Record<string, keyof ClientImport> = {
  'name': 'name',
  'client name': 'name',
  'client': 'name',
  'phone': 'phone',
  'phone number': 'phone',
  'tel': 'phone',
  'project': 'project_name',
  'project name': 'project_name',
  'project_name': 'project_name',
  'plot': 'plot_number',
  'plot number': 'plot_number',
  'plot no': 'plot_number',
  'plot_number': 'plot_number',
  'unit price': 'unit_price',
  'unit_price': 'unit_price',
  'price per plot': 'unit_price',
  'number of plots': 'number_of_plots',
  'no of plots': 'number_of_plots',
  'plots': 'number_of_plots',
  'number_of_plots': 'number_of_plots',
  'total price': 'total_price',
  'total_price': 'total_price',
  'price': 'total_price',
  'discount': 'discount',
  'total paid': 'total_paid',
  'total_paid': 'total_paid',
  'paid': 'total_paid',
  'balance': 'balance',
  'remaining': 'balance',
  'sales agent': 'sales_agent',
  'sales_agent': 'sales_agent',
  'agent': 'sales_agent',
  'payment period': 'payment_period',
  'payment_period': 'payment_period',
  'period': 'payment_period',
  'payment type': 'payment_type',
  'payment_type': 'payment_type',
  'type': 'payment_type',
  'completion date': 'completion_date',
  'completion_date': 'completion_date',
  'next payment date': 'next_payment_date',
  'next_payment_date': 'next_payment_date',
  'next payment': 'next_payment_date',
  'notes': 'notes',
  'remarks': 'notes',
  'status': 'status',
  'sale date': 'sale_date',
  'sale_date': 'sale_date',
  'date of sale': 'sale_date',
};

const parseNumber = (value: any): number => {
  if (value === null || value === undefined || value === '' || value === '-') return 0;
  if (typeof value === 'number') return value;
  const cleaned = value.toString().replace(/[,KES\s]/gi, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const parseDate = (value: any): string | null => {
  if (!value) return null;
  
  // Handle Excel serial dates
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {}
  
  return null;
};

export const ExcelUploadDialog = ({ open, onClose, onImportComplete }: ExcelUploadDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ClientImport[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mappedColumns, setMappedColumns] = useState<string[]>([]);
  const [unmappedColumns, setUnmappedColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast.error('Excel file is empty or has no data rows');
        setFile(null);
        setParsing(false);
        return;
      }

      // Get headers from first row
      const headers = (jsonData[0] as string[]).map(h => h?.toString().toLowerCase().trim() || '');
      
      // Map columns
      const mapped: string[] = [];
      const unmapped: string[] = [];
      const columnIndexMap: Record<number, keyof ClientImport> = {};

      headers.forEach((header, index) => {
        const mappedField = COLUMN_MAPPING[header];
        if (mappedField) {
          columnIndexMap[index] = mappedField;
          mapped.push(header);
        } else if (header) {
          unmapped.push(header);
        }
      });

      setMappedColumns(mapped);
      setUnmappedColumns(unmapped);

      // Parse data rows
      const clients: ClientImport[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const client: Partial<ClientImport> = {
          name: '',
          phone: '',
          project_name: '',
          plot_number: '',
          unit_price: 0,
          number_of_plots: 1,
          total_price: 0,
          discount: 0,
          total_paid: 0,
          balance: 0,
          sales_agent: '',
          payment_type: 'installments',
          payment_period: '',
          completion_date: null,
          next_payment_date: null,
          notes: '',
          status: 'ongoing',
          sale_date: null,
        };

        Object.entries(columnIndexMap).forEach(([indexStr, field]) => {
          const index = parseInt(indexStr);
          const value = row[index];

          if (value === undefined || value === null) return;

          switch (field) {
            case 'name':
            case 'phone':
            case 'project_name':
            case 'plot_number':
            case 'sales_agent':
            case 'payment_period':
            case 'payment_type':
            case 'notes':
            case 'status':
              (client as any)[field] = value?.toString() || '';
              break;
            case 'unit_price':
            case 'number_of_plots':
            case 'total_price':
            case 'discount':
            case 'total_paid':
            case 'balance':
              (client as any)[field] = parseNumber(value);
              break;
            case 'completion_date':
            case 'next_payment_date':
            case 'sale_date':
              (client as any)[field] = parseDate(value);
              break;
          }
        });

        // Skip rows without a name
        if (!client.name?.trim()) continue;

        // Ensure phone is a string
        if (client.phone && typeof client.phone !== 'string') {
          client.phone = String(client.phone);
        }

        clients.push(client as ClientImport);
      }

      setParsedData(clients);
      toast.success(`Parsed ${clients.length} records from Excel`);
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
      await bulkImportClients(parsedData);
      toast.success(`Successfully imported ${parsedData.length} clients!`);
      onImportComplete();
      handleClose();
    } catch (error) {
      console.error('Error importing clients:', error);
      toast.error('Failed to import clients');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setMappedColumns([]);
    setUnmappedColumns([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Clients from Excel
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx or .xls) containing client data. The system will automatically map columns to the database fields.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Drop your Excel file here</p>
              <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
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
          </div>
        ) : parsing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Parsing Excel file...</p>
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
                    {parsedData.length} records found
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Column Mapping Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Mapped Columns ({mappedColumns.length})
                </Label>
                <div className="flex flex-wrap gap-1">
                  {mappedColumns.map((col) => (
                    <Badge key={col} variant="secondary" className="text-xs">
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>
              {unmappedColumns.length > 0 && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Unmapped Columns ({unmappedColumns.length})
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {unmappedColumns.map((col) => (
                      <Badge key={col} variant="outline" className="text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Data Preview */}
            <div>
              <Label className="mb-2 block">Data Preview (first 10 records)</Label>
              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Plot</TableHead>
                      <TableHead className="text-right">Total Price</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((client, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.project_name}</TableCell>
                        <TableCell>{client.plot_number}</TableCell>
                        <TableCell className="text-right">{formatCurrency(client.total_price)}</TableCell>
                        <TableCell className="text-right text-primary">{formatCurrency(client.total_paid)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(client.balance)}</TableCell>
                        <TableCell>
                          <Badge variant={client.status === 'completed' ? 'default' : 'secondary'}>
                            {client.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {parsedData.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  ... and {parsedData.length - 10} more records
                </p>
              )}
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Importing will add {parsedData.length} new client records to the database. 
                This will not delete or modify existing records.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          {parsedData.length > 0 && (
            <Button onClick={handleImport} disabled={importing}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {parsedData.length} Clients
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
