import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { CancelledSale } from '@/types/cancelledSale';
import { Expense } from '@/types/expense';
import { formatCurrency } from '@/lib/supabaseStorage';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  Ban,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

interface CancelledSalesAuditReportProps {
  cancelledSales: CancelledSale[];
  expenses: Expense[];
}

export const CancelledSalesAuditReport = ({ cancelledSales, expenses }: CancelledSalesAuditReportProps) => {
  // Calculate audit summary
  const auditSummary = useMemo(() => {
    const refundExpenses = expenses.filter(e => e.category === 'Refund');
    const totalRefundExpenses = refundExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const totalOriginalValue = cancelledSales.reduce((sum, s) => sum + s.total_price, 0);
    const totalCollected = cancelledSales.reduce((sum, s) => sum + s.total_paid, 0);
    const totalRefunded = cancelledSales.reduce((sum, s) => sum + s.net_refund, 0);
    const totalFees = cancelledSales.reduce((sum, s) => sum + s.cancellation_fee, 0);
    const totalRetained = totalCollected - totalRefunded;
    
    const transferredCount = cancelledSales.filter(s => s.outcome_type === 'transferred').length;
    const refundedCount = cancelledSales.filter(s => s.outcome_type === 'refunded' || s.refund_status === 'completed').length;
    const retainedCount = cancelledSales.filter(s => s.outcome_type === 'retained' || s.refund_status === 'none').length;
    const pendingCount = cancelledSales.filter(s => s.outcome_type === 'pending' && s.refund_status === 'pending').length;
    
    // Variance check - compare recorded refund expenses vs cancelled sales net refunds
    const refundVariance = totalRefundExpenses - totalRefunded;
    
    return {
      totalOriginalValue,
      totalCollected,
      totalRefunded,
      totalFees,
      totalRetained,
      totalRefundExpenses,
      refundVariance,
      transferredCount,
      refundedCount,
      retainedCount,
      pendingCount,
      totalCancelled: cancelledSales.length,
    };
  }, [cancelledSales, expenses]);

  // Create audit ledger entries
  const auditLedger = useMemo(() => {
    const entries: Array<{
      date: string;
      reference: string;
      description: string;
      client: string;
      debit: number;
      credit: number;
      category: 'Revenue Loss' | 'Cash Outflow' | 'Fee Income' | 'Retained';
    }> = [];

    cancelledSales.forEach(sale => {
      // Revenue loss entry (what we won't collect anymore)
      const uncollectedAmount = sale.total_price - sale.total_paid;
      if (uncollectedAmount > 0) {
        entries.push({
          date: sale.cancellation_date,
          reference: `CAN-${sale.id.slice(0, 8)}`,
          description: `Revenue loss - ${sale.project_name} ${sale.plot_number}`,
          client: sale.client_name,
          debit: uncollectedAmount,
          credit: 0,
          category: 'Revenue Loss',
        });
      }

      // Refund outflow (if refunded)
      if (sale.net_refund > 0) {
        entries.push({
          date: sale.processed_date || sale.cancellation_date,
          reference: `REF-${sale.id.slice(0, 8)}`,
          description: `Refund paid - ${sale.project_name} ${sale.plot_number}`,
          client: sale.client_name,
          debit: sale.net_refund,
          credit: 0,
          category: 'Cash Outflow',
        });
      }

      // Cancellation fee income
      if (sale.cancellation_fee > 0) {
        entries.push({
          date: sale.cancellation_date,
          reference: `FEE-${sale.id.slice(0, 8)}`,
          description: `Cancellation fee - ${sale.project_name} ${sale.plot_number}`,
          client: sale.client_name,
          debit: 0,
          credit: sale.cancellation_fee,
          category: 'Fee Income',
        });
      }

      // Retained amount (if any was kept beyond fees)
      const retainedBeyondFees = sale.total_paid - sale.net_refund - sale.cancellation_fee;
      if (retainedBeyondFees > 0) {
        entries.push({
          date: sale.cancellation_date,
          reference: `RET-${sale.id.slice(0, 8)}`,
          description: `Forfeited amount - ${sale.project_name} ${sale.plot_number}`,
          client: sale.client_name,
          debit: 0,
          credit: retainedBeyondFees,
          category: 'Retained',
        });
      }
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cancelledSales]);

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'transferred':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-300"><ArrowRight className="w-3 h-3 mr-1" />Transferred</Badge>;
      case 'refunded':
        return <Badge className="bg-orange-500/20 text-orange-700 border-orange-300"><RefreshCw className="w-3 h-3 mr-1" />Refunded</Badge>;
      case 'retained':
        return <Badge className="bg-green-500/20 text-green-700 border-green-300"><CheckCircle2 className="w-3 h-3 mr-1" />Retained</Badge>;
      case 'partial_refund':
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-300"><DollarSign className="w-3 h-3 mr-1" />Partial</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Revenue Loss': return 'text-red-600';
      case 'Cash Outflow': return 'text-orange-600';
      case 'Fee Income': return 'text-green-600';
      case 'Retained': return 'text-blue-600';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Audit Summary Header */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Cancelled Sales Audit Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-card rounded-lg border">
              <p className="text-2xl font-bold">{auditSummary.totalCancelled}</p>
              <p className="text-xs text-muted-foreground">Total Cancelled</p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg border">
              <p className="text-2xl font-bold text-blue-600">{auditSummary.transferredCount}</p>
              <p className="text-xs text-muted-foreground">Transferred</p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg border">
              <p className="text-2xl font-bold text-orange-600">{auditSummary.refundedCount}</p>
              <p className="text-xs text-muted-foreground">Refunded</p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg border">
              <p className="text-2xl font-bold text-amber-600">{auditSummary.pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending Action</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Reconciliation */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Outflows (Debits)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Lost Future Revenue</span>
              <span className="font-medium text-red-600">
                {formatCurrency(auditSummary.totalOriginalValue - auditSummary.totalCollected)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Refunds Paid</span>
              <span className="font-medium text-orange-600">{formatCurrency(auditSummary.totalRefunded)}</span>
            </div>
            <div className="flex justify-between py-2 font-bold">
              <span>Total Cash Outflow</span>
              <span className="text-red-600">{formatCurrency(auditSummary.totalRefunded)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Inflows (Credits)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Cancellation Fees</span>
              <span className="font-medium text-green-600">{formatCurrency(auditSummary.totalFees)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Amount Retained</span>
              <span className="font-medium text-green-600">{formatCurrency(auditSummary.totalRetained)}</span>
            </div>
            <div className="flex justify-between py-2 font-bold">
              <span>Total Retained</span>
              <span className="text-green-600">{formatCurrency(auditSummary.totalRetained)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Check */}
      {Math.abs(auditSummary.refundVariance) > 0.01 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Ban className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Variance Detected</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Refund expenses recorded ({formatCurrency(auditSummary.totalRefundExpenses)}) differs from 
                  cancelled sales refunds ({formatCurrency(auditSummary.totalRefunded)}) by {formatCurrency(Math.abs(auditSummary.refundVariance))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Audit Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit Trail Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLedger.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No entries to display</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLedger.slice(0, 50).map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">
                        {format(new Date(entry.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{entry.reference}</TableCell>
                      <TableCell className="text-sm">{entry.client}</TableCell>
                      <TableCell className="text-sm">{entry.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryColor(entry.category)}>
                          {entry.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {auditLedger.length > 50 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Showing 50 of {auditLedger.length} entries
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Client History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Outcome History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Original Sale</TableHead>
                  <TableHead>Cancelled</TableHead>
                  <TableHead className="text-right">Was Paid</TableHead>
                  <TableHead className="text-right">Refunded</TableHead>
                  <TableHead className="text-right">Retained</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Transfer To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cancelledSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sale.client_name}</p>
                        <p className="text-xs text-muted-foreground">{sale.client_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sale.project_name}</p>
                        <p className="text-xs text-muted-foreground">{sale.plot_number}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(sale.cancellation_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total_paid)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(sale.net_refund)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(sale.total_paid - sale.net_refund)}
                    </TableCell>
                    <TableCell>{getOutcomeBadge(sale.outcome_type || 'pending')}</TableCell>
                    <TableCell>
                      {sale.transferred_to_project ? (
                        <div className="text-sm">
                          <p className="font-medium">{sale.transferred_to_project}</p>
                          <p className="text-xs text-muted-foreground">{sale.transferred_to_plot}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
