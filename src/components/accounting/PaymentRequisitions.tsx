import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Payment, Client } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { format } from 'date-fns';
import { 
  Search, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Download,
  Calendar,
  CreditCard,
  Hash,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface PaymentRequisitionsProps {
  payments: Payment[];
  clients: Client[];
  onRefresh: () => void;
}

interface ReconciledPayment extends Payment {
  clientName: string;
  projectName: string;
  isReconciled: boolean;
}

export const PaymentRequisitions = ({ payments, clients, onRefresh }: PaymentRequisitionsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [reconciledFilter, setReconciledFilter] = useState<'all' | 'reconciled' | 'unreconciled'>('all');
  const [reconciledPayments, setReconciledPayments] = useState<Set<string>>(new Set());

  // Build client lookup map
  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach(client => map.set(client.id, client));
    return map;
  }, [clients]);

  // Merge payments with client info
  const paymentsWithClientInfo: ReconciledPayment[] = useMemo(() => {
    return payments.map(payment => {
      const client = clientMap.get(payment.client_id);
      return {
        ...payment,
        clientName: client?.name || 'Unknown',
        projectName: client?.project_name || 'Unknown',
        isReconciled: reconciledPayments.has(payment.id),
      };
    });
  }, [payments, clientMap, reconciledPayments]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return paymentsWithClientInfo.filter(payment => {
      // Search filter
      const matchesSearch = 
        payment.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.projectName.toLowerCase().includes(searchTerm.toLowerCase());

      // Date filter
      const paymentDate = new Date(payment.payment_date);
      const matchesDateFrom = !dateFrom || paymentDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || paymentDate <= new Date(dateTo + 'T23:59:59');

      // Payment method filter
      const matchesMethod = paymentMethodFilter === 'all' || payment.payment_method === paymentMethodFilter;

      // Reconciled filter
      const matchesReconciled = 
        reconciledFilter === 'all' ||
        (reconciledFilter === 'reconciled' && payment.isReconciled) ||
        (reconciledFilter === 'unreconciled' && !payment.isReconciled);

      return matchesSearch && matchesDateFrom && matchesDateTo && matchesMethod && matchesReconciled;
    });
  }, [paymentsWithClientInfo, searchTerm, dateFrom, dateTo, paymentMethodFilter, reconciledFilter]);

  // Summary statistics
  const summary = useMemo(() => {
    const totalPayments = filteredPayments.length;
    const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const reconciledCount = filteredPayments.filter(p => p.isReconciled).length;
    const unreconciledCount = filteredPayments.filter(p => !p.isReconciled).length;
    const withReference = filteredPayments.filter(p => p.reference_number).length;
    const withoutReference = filteredPayments.filter(p => !p.reference_number).length;

    return {
      totalPayments,
      totalAmount,
      reconciledCount,
      unreconciledCount,
      withReference,
      withoutReference,
    };
  }, [filteredPayments]);

  // Payment methods for filter
  const paymentMethods = useMemo(() => {
    const methods = new Set<string>();
    payments.forEach(p => methods.add(p.payment_method));
    return Array.from(methods);
  }, [payments]);

  const toggleReconciled = (paymentId: string) => {
    setReconciledPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
  };

  const markAllAsReconciled = () => {
    const newSet = new Set(reconciledPayments);
    filteredPayments.forEach(p => newSet.add(p.id));
    setReconciledPayments(newSet);
  };

  const clearReconciliation = () => {
    setReconciledPayments(new Set());
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Receipt No.', 'Reference No.', 'Client', 'Project', 'Amount', 'Method', 'Reconciled'];
    const rows = filteredPayments.map(p => [
      format(new Date(p.payment_date), 'yyyy-MM-dd'),
      p.receipt_number,
      p.reference_number || '-',
      p.clientName,
      p.projectName,
      p.amount.toString(),
      p.payment_method,
      p.isReconciled ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-requisitions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <FileText className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{summary.totalPayments}</p>
            <p className="text-xs text-muted-foreground">Total Payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CreditCard className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-base font-bold text-green-600 truncate">{formatCurrency(summary.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">Total Amount</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950 border-green-200">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{summary.reconciledCount}</p>
            <p className="text-xs text-muted-foreground">Reconciled</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200">
          <CardContent className="p-3 text-center">
            <XCircle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-600">{summary.unreconciledCount}</p>
            <p className="text-xs text-muted-foreground">Unreconciled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Hash className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">{summary.withReference}</p>
            <p className="text-xs text-muted-foreground">With Reference</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950 border-red-200">
          <CardContent className="p-3 text-center">
            <Hash className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-600">{summary.withoutReference}</p>
            <p className="text-xs text-muted-foreground">No Reference</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters & Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by receipt, reference, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Method</Label>
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {paymentMethods.map(method => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={reconciledFilter} onValueChange={(v: 'all' | 'reconciled' | 'unreconciled') => setReconciledFilter(v)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="reconciled">Reconciled</SelectItem>
                    <SelectItem value="unreconciled">Unreconciled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={markAllAsReconciled}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Mark All Reconciled
            </Button>
            <Button variant="outline" size="sm" onClick={clearReconciliation}>
              <XCircle className="w-4 h-4 mr-1" />
              Clear Reconciliation
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Payment Requisitions
          </CardTitle>
          <CardDescription>
            Match receipt reference numbers with bank statements for reconciliation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No payments found matching your filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">✓</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt No.</TableHead>
                    <TableHead>Reference No.</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow 
                      key={payment.id}
                      className={payment.isReconciled ? 'bg-green-50 dark:bg-green-950/30' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={payment.isReconciled}
                          onCheckedChange={() => toggleReconciled(payment.id)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(payment.payment_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {payment.receipt_number}
                      </TableCell>
                      <TableCell>
                        {payment.reference_number ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {payment.reference_number}
                          </Badge>
                        ) : (
                          <span className="text-red-500 text-xs">No reference</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{payment.clientName}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.projectName}</TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{payment.payment_method}</Badge>
                      </TableCell>
                      <TableCell>
                        {payment.isReconciled ? (
                          <Badge className="bg-green-500/20 text-green-700 border-green-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Reconciled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
