import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CancelledSale, CancelledSaleOutcome } from '@/types/cancelledSale';
import { Expense } from '@/types/expense';
import { getCancelledSales, updateCancelledSale } from '@/lib/cancelledSalesStorage';
import { formatCurrency } from '@/lib/supabaseStorage';
import { addExpense, generateExpenseReference, getExpenses } from '@/lib/expenseStorage';
import { XCircle, DollarSign, AlertTriangle, RefreshCw, Edit2, Ban, CheckCircle2, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CancelledSalesAuditReport } from './CancelledSalesAuditReport';
import { supabase } from '@/integrations/supabase/client';

export const CancelledSalesSection = () => {
  const [cancelledSales, setCancelledSales] = useState<CancelledSale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('manage');
  const [editingSale, setEditingSale] = useState<CancelledSale | null>(null);
  const [refundAmount, setRefundAmount] = useState('0');
  const [cancellationFee, setCancellationFee] = useState('0');
  const [refundStatus, setRefundStatus] = useState<CancelledSale['refund_status']>('pending');
  const [outcomeType, setOutcomeType] = useState<CancelledSaleOutcome>('pending');
  const [transferredProject, setTransferredProject] = useState('');
  const [transferredPlot, setTransferredPlot] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [cancellationDate, setCancellationDate] = useState('');
  const [refundDate, setRefundDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesData, expensesData] = await Promise.all([
        getCancelledSales(),
        getExpenses(),
      ]);
      setCancelledSales(salesData);
      setExpenses(expensesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditDialog = (sale: CancelledSale) => {
    setEditingSale(sale);
    setRefundAmount(sale.refund_amount.toString());
    setCancellationFee(sale.cancellation_fee.toString());
    setRefundStatus(sale.refund_status);
    setOutcomeType(sale.outcome_type || 'pending');
    setTransferredProject(sale.transferred_to_project || '');
    setTransferredPlot(sale.transferred_to_plot || '');
    setAuditNotes(sale.audit_notes || '');
    setNotes(sale.notes || '');
    setCancellationDate(sale.cancellation_date ? sale.cancellation_date.split('T')[0] : '');
    setRefundDate(sale.processed_date ? sale.processed_date.split('T')[0] : '');
  };

  const handleUpdateRefund = async () => {
    if (!editingSale) return;

    const refund = parseFloat(refundAmount) || 0;
    const fee = parseFloat(cancellationFee) || 0;
    const netRefund = Math.max(0, refund - fee);
    const incomeRetained = editingSale.total_paid - netRefund;

    // Check if we need to create a new expense (status changed to completed/partial and net refund > 0)
    const wasNotRefunded = editingSale.refund_status === 'pending' || editingSale.refund_status === 'none';
    const isNowRefunded = refundStatus === 'completed' || refundStatus === 'partial';
    const shouldCreateExpense = wasNotRefunded && isNowRefunded && netRefund > 0;

    // Also check if refund amount increased significantly (additional refund)
    const previousNetRefund = editingSale.net_refund || 0;
    const additionalRefund = netRefund - previousNetRefund;
    const hasAdditionalRefund = additionalRefund > 0 && !wasNotRefunded && isNowRefunded;

    // Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser();

    try {
      // Determine outcome type based on refund status if not explicitly set
      let finalOutcome = outcomeType;
      if (outcomeType === 'pending') {
        if (refundStatus === 'completed') finalOutcome = 'refunded';
        else if (refundStatus === 'partial') finalOutcome = 'partial_refund';
        else if (refundStatus === 'none') finalOutcome = 'retained';
      }

      await updateCancelledSale(editingSale.id, {
        refund_amount: refund,
        cancellation_fee: fee,
        net_refund: netRefund,
        refund_status: refundStatus,
        outcome_type: finalOutcome,
        transferred_to_project: outcomeType === 'transferred' ? transferredProject : null,
        transferred_to_plot: outcomeType === 'transferred' ? transferredPlot : null,
        audit_notes: auditNotes || null,
        income_retained: incomeRetained,
        expense_recorded: netRefund,
        cancellation_date: cancellationDate ? new Date(cancellationDate).toISOString() : editingSale.cancellation_date,
        processed_date: refundDate ? new Date(refundDate).toISOString() : ((shouldCreateExpense || hasAdditionalRefund || finalOutcome !== 'pending') ? new Date().toISOString() : null),
        processed_by: user?.id || null,
        notes: notes,
      });

      // Create expense entry for refund
      if (shouldCreateExpense || hasAdditionalRefund) {
        const expenseAmount = shouldCreateExpense ? netRefund : additionalRefund;
        await addExpense({
          expense_date: new Date().toISOString(),
          category: 'Refund',
          description: `Refund for cancelled sale - ${editingSale.client_name} (${editingSale.plot_number})`,
          amount: expenseAmount,
          payment_method: 'Cash',
          recipient: editingSale.client_name,
          reference_number: generateExpenseReference(),
          agent_id: null,
          client_id: editingSale.client_id,
          is_commission_payout: false,
          notes: `Cancelled sale refund. Project: ${editingSale.project_name}, Original sale: ${formatCurrency(editingSale.total_price)}, Was paid: ${formatCurrency(editingSale.total_paid)}, Net refund: ${formatCurrency(expenseAmount)}. Outcome: ${finalOutcome}`,
          created_by: null,
        });
        toast.success('Cancelled sale updated and refund expense recorded');
      } else {
        toast.success('Cancelled sale updated successfully');
      }
      
      setEditingSale(null);
      fetchData();
    } catch (error) {
      console.error('Error updating cancelled sale:', error);
      toast.error('Failed to update cancelled sale');
    }
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalCancelled = cancelledSales.length;
    const totalSaleValue = cancelledSales.reduce((sum, s) => sum + s.total_price, 0);
    const totalCollectedBeforeCancel = cancelledSales.reduce((sum, s) => sum + s.total_paid, 0);
    const totalRefunded = cancelledSales.reduce((sum, s) => sum + s.net_refund, 0);
    const totalFees = cancelledSales.reduce((sum, s) => sum + s.cancellation_fee, 0);
    const pendingRefunds = cancelledSales.filter(s => s.refund_status === 'pending').length;
    const retainedAmount = totalCollectedBeforeCancel - totalRefunded;

    return {
      totalCancelled,
      totalSaleValue,
      totalCollectedBeforeCancel,
      totalRefunded,
      totalFees,
      pendingRefunds,
      retainedAmount,
    };
  }, [cancelledSales]);

  const getStatusBadge = (status: CancelledSale['refund_status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-700 border-green-300">Refunded</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-300">Partial</Badge>;
      case 'pending':
        return <Badge className="bg-red-500/20 text-red-700 border-red-300">Pending</Badge>;
      case 'none':
        return <Badge className="bg-muted text-muted-foreground">No Refund</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOutcomeBadge = (outcome: CancelledSaleOutcome) => {
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
        return <Badge variant="outline"><Ban className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading cancelled sales...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs for Management vs Audit Report */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Manage Sales
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Audit Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="mt-4 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card className="bg-red-500/10 border-red-200">
              <CardContent className="p-3 text-center">
                <Ban className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-600">{summary.totalCancelled}</p>
                <p className="text-xs text-muted-foreground">Cancelled Sales</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <DollarSign className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-lg font-bold">{formatCurrency(summary.totalSaleValue)}</p>
                <p className="text-xs text-muted-foreground">Original Value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <DollarSign className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.totalCollectedBeforeCancel)}</p>
                <p className="text-xs text-muted-foreground">Was Collected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <RefreshCw className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-orange-600">{formatCurrency(summary.totalRefunded)}</p>
                <p className="text-xs text-muted-foreground">Refunded</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-600">{formatCurrency(summary.totalFees)}</p>
                <p className="text-xs text-muted-foreground">Cancel Fees</p>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10 border-green-200">
              <CardContent className="p-3 text-center">
                <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-600">{formatCurrency(summary.retainedAmount)}</p>
                <p className="text-xs text-muted-foreground">Retained</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/10 border-amber-200">
              <CardContent className="p-3 text-center">
                <XCircle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-600">{summary.pendingRefunds}</p>
                <p className="text-xs text-muted-foreground">Pending Refunds</p>
              </CardContent>
            </Card>
          </div>

          {/* Cancelled Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Cancelled Sales Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cancelledSales.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No cancelled sales recorded
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Project/Plot</TableHead>
                        <TableHead>Cancel Date</TableHead>
                        <TableHead>Refund Date</TableHead>
                        <TableHead className="text-right">Was Collected</TableHead>
                        <TableHead className="text-right">Net Refund</TableHead>
                        <TableHead className="text-right">Retained</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead></TableHead>
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
                          <TableCell className="text-sm text-muted-foreground">
                            {sale.processed_date ? format(new Date(sale.processed_date), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(sale.total_paid)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            {formatCurrency(sale.net_refund)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatCurrency(sale.total_paid - sale.net_refund)}
                          </TableCell>
                          <TableCell>{getStatusBadge(sale.refund_status)}</TableCell>
                          <TableCell>{getOutcomeBadge(sale.outcome_type || 'pending')}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(sale)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
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

        <TabsContent value="audit" className="mt-4">
          <CancelledSalesAuditReport 
            cancelledSales={cancelledSales}
            expenses={expenses}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background pb-4 border-b">
            <DialogTitle>Update Refund Details</DialogTitle>
            <DialogDescription>
              Update refund status and amounts for {editingSale?.client_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount Collected</Label>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(editingSale?.total_paid || 0)}
                </p>
              </div>
              <div>
                <Label>Original Sale Value</Label>
                <p className="text-lg font-bold">
                  {formatCurrency(editingSale?.total_price || 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="refundAmount">Refund Amount</Label>
                <Input
                  id="refundAmount"
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancellationFee">Cancellation Fee/Deduction</Label>
                <Input
                  id="cancellationFee"
                  type="number"
                  value={cancellationFee}
                  onChange={(e) => setCancellationFee(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Net Refund Amount:</span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(Math.max(0, (parseFloat(refundAmount) || 0) - (parseFloat(cancellationFee) || 0)))}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-muted-foreground">Retained by Company:</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency((editingSale?.total_paid || 0) - Math.max(0, (parseFloat(refundAmount) || 0) - (parseFloat(cancellationFee) || 0)))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="refundStatus">Refund Status</Label>
                <Select value={refundStatus} onValueChange={(v) => setRefundStatus(v as CancelledSale['refund_status'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial Refund</SelectItem>
                    <SelectItem value="completed">Fully Refunded</SelectItem>
                    <SelectItem value="none">No Refund (Forfeited)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="outcomeType">Outcome</Label>
                <Select value={outcomeType} onValueChange={(v) => setOutcomeType(v as CancelledSaleOutcome)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Decision</SelectItem>
                    <SelectItem value="refunded">Fully Refunded</SelectItem>
                    <SelectItem value="partial_refund">Partially Refunded</SelectItem>
                    <SelectItem value="retained">Amount Retained</SelectItem>
                    <SelectItem value="transferred">Transferred to New Plot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {outcomeType === 'transferred' && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
                <div className="space-y-2">
                  <Label htmlFor="transferredProject">New Project</Label>
                  <Input
                    id="transferredProject"
                    value={transferredProject}
                    onChange={(e) => setTransferredProject(e.target.value)}
                    placeholder="Enter project name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferredPlot">New Plot Number</Label>
                  <Input
                    id="transferredPlot"
                    value={transferredPlot}
                    onChange={(e) => setTransferredPlot(e.target.value)}
                    placeholder="Enter plot number"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cancellationDate">Cancellation Date</Label>
                <Input
                  id="cancellationDate"
                  type="date"
                  value={cancellationDate}
                  onChange={(e) => setCancellationDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refundDate">Refund Date</Label>
                <Input
                  id="refundDate"
                  type="date"
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auditNotes">Audit Notes (for accounting records)</Label>
              <Textarea
                id="auditNotes"
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                placeholder="Detailed notes for audit trail..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">General Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for cancellation, refund details, etc."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSale(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRefund}>
              Update Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
