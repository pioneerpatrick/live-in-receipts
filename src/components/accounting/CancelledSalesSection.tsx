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
import { Project, Plot } from '@/types/project';
import { Client } from '@/types/client';
import { getCancelledSales, updateCancelledSale, deleteCancelledSale } from '@/lib/cancelledSalesStorage';
import { formatCurrency, addClient } from '@/lib/supabaseStorage';
import { addExpense, generateExpenseReference, getExpenses } from '@/lib/expenseStorage';
import { getProjects, getPlots, sellPlot } from '@/lib/projectStorage';
import { XCircle, DollarSign, AlertTriangle, RefreshCw, Edit2, Ban, CheckCircle2, FileText, ArrowRight, Trash2, Loader2, Search as SearchIcon, History } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CancelledSalesAuditReport } from './CancelledSalesAuditReport';
import { supabase } from '@/integrations/supabase/client';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaymentHistory } from '@/components/PaymentHistory';

export const CancelledSalesSection = () => {
  const [cancelledSales, setCancelledSales] = useState<CancelledSale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availablePlots, setAvailablePlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [activeTab, setActiveTab] = useState('manage');
  const [editingSale, setEditingSale] = useState<CancelledSale | null>(null);
  const [refundAmount, setRefundAmount] = useState('0');
  const [cancellationFee, setCancellationFee] = useState('0');
  const [refundStatus, setRefundStatus] = useState<CancelledSale['refund_status']>('pending');
  const [outcomeType, setOutcomeType] = useState<CancelledSaleOutcome>('pending');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [transferredProject, setTransferredProject] = useState('');
  const [transferredPlot, setTransferredPlot] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [cancellationDate, setCancellationDate] = useState('');
  const [refundDate, setRefundDate] = useState('');
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesData, expensesData, projectsData] = await Promise.all([
        getCancelledSales(),
        getExpenses(),
        getProjects(),
      ]);
      setCancelledSales(salesData);
      setExpenses(expensesData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available plots when project is selected
  const fetchAvailablePlots = async (projectId: string) => {
    if (!projectId) {
      setAvailablePlots([]);
      return;
    }
    try {
      setLoadingPlots(true);
      const plots = await getPlots(projectId);
      const available = plots.filter(p => p.status === 'available');
      setAvailablePlots(available);
    } catch (error) {
      console.error('Error fetching plots:', error);
      toast.error('Failed to load available plots');
    } finally {
      setLoadingPlots(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When project selection changes, fetch available plots
  useEffect(() => {
    if (selectedProjectId) {
      fetchAvailablePlots(selectedProjectId);
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        setTransferredProject(project.name);
      }
    } else {
      setAvailablePlots([]);
      setTransferredProject('');
    }
    setSelectedPlotId('');
    setTransferredPlot('');
  }, [selectedProjectId, projects]);

  const openEditDialog = (sale: CancelledSale) => {
    setEditingSale(sale);
    setRefundAmount(sale.refund_amount.toString());
    setCancellationFee(sale.cancellation_fee.toString());
    setRefundStatus(sale.refund_status);
    setOutcomeType(sale.outcome_type || 'pending');
    setSelectedProjectId('');
    setSelectedPlotId('');
    setTransferredProject(sale.transferred_to_project || '');
    setTransferredPlot(sale.transferred_to_plot || '');
    setAuditNotes(sale.audit_notes || '');
    setNotes(sale.notes || '');
    setCancellationDate(sale.cancellation_date ? sale.cancellation_date.split('T')[0] : '');
    setRefundDate(sale.processed_date ? sale.processed_date.split('T')[0] : '');
    setAvailablePlots([]);
  };

  const handleUpdateRefund = async () => {
    if (!editingSale) return;

    const refund = parseFloat(refundAmount) || 0;
    const fee = parseFloat(cancellationFee) || 0;
    const netRefund = Math.max(0, refund - fee);
    const incomeRetained = editingSale.total_paid - netRefund;

    // For transfer: calculate transferred amount (total paid minus any refund)
    const transferredAmount = outcomeType === 'transferred' ? (editingSale.total_paid - netRefund) : 0;

    // Check if we need to create a new expense (status changed to completed/partial and net refund > 0)
    const wasNotRefunded = editingSale.refund_status === 'pending' || editingSale.refund_status === 'none';
    const isNowRefunded = refundStatus === 'completed' || refundStatus === 'partial';
    const shouldCreateExpense = wasNotRefunded && isNowRefunded && netRefund > 0;

    // Also check if refund amount increased significantly (additional refund)
    const previousNetRefund = editingSale.net_refund || 0;
    const additionalRefund = netRefund - previousNetRefund;
    const hasAdditionalRefund = additionalRefund > 0 && !wasNotRefunded && isNowRefunded;

    // Validate transfer requirements
    if (outcomeType === 'transferred') {
      if (!selectedProjectId || !selectedPlotId) {
        toast.error('Please select both a project and a plot for the transfer');
        return;
      }
    }

    // Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser();

    try {
      setTransferring(true);

      // Determine outcome type based on refund status if not explicitly set
      let finalOutcome = outcomeType;
      if (outcomeType === 'pending') {
        if (refundStatus === 'completed') finalOutcome = 'refunded';
        else if (refundStatus === 'partial') finalOutcome = 'partial_refund';
        else if (refundStatus === 'none') finalOutcome = 'retained';
      }

      let newClientId: string | null = null;

      // If transferring, create new client entry with transferred amount as initial payment
      if (outcomeType === 'transferred' && selectedProjectId && selectedPlotId) {
        const selectedProject = projects.find(p => p.id === selectedProjectId);
        const selectedPlot = availablePlots.find(p => p.id === selectedPlotId);

        if (selectedProject && selectedPlot) {
          // Create new client with the transferred amount as initial payment
          const newClient = await addClient({
            name: editingSale.client_name,
            phone: editingSale.client_phone || '',
            email: null,
            project_name: selectedProject.name,
            plot_number: selectedPlot.plot_number,
            unit_price: selectedPlot.price,
            number_of_plots: 1,
            total_price: selectedPlot.price,
            discount: 0,
            total_paid: transferredAmount,
            balance: selectedPlot.price - transferredAmount,
            sales_agent: '',
            payment_type: 'installments',
            payment_period: 'monthly',
            installment_months: null,
            initial_payment_method: 'Transfer',
            completion_date: null,
            next_payment_date: null,
            notes: `Transferred from cancelled sale. Original project: ${editingSale.project_name}, Plot: ${editingSale.plot_number}. Transferred amount: ${formatCurrency(transferredAmount)}`,
            status: 'ongoing',
            sale_date: new Date().toISOString().split('T')[0],
            commission: null,
            commission_received: null,
            commission_balance: null,
          });

          newClientId = newClient.id;

          // Mark the plot as sold to the new client
          await sellPlot(selectedPlotId, newClient.id);

          toast.success(`Client transferred to ${selectedProject.name} - ${selectedPlot.plot_number} with ${formatCurrency(transferredAmount)} as initial payment`);
        }
      }

      await updateCancelledSale(editingSale.id, {
        refund_amount: refund,
        cancellation_fee: fee,
        net_refund: netRefund,
        refund_status: refundStatus,
        outcome_type: finalOutcome,
        transferred_to_client_id: newClientId,
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

      // Create expense entry for refund - only if actually refunded (not for transfer without refund)
      if ((shouldCreateExpense || hasAdditionalRefund) && outcomeType !== 'transferred') {
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
      } else if (outcomeType !== 'transferred') {
        toast.success('Cancelled sale updated successfully');
      }
      
      setEditingSale(null);
      fetchData();
    } catch (error) {
      console.error('Error updating cancelled sale:', error);
      toast.error('Failed to update cancelled sale');
    } finally {
      setTransferring(false);
    }
  };

  const handleDeleteCancelledSale = async () => {
    if (!deletingSaleId) return;
    try {
      await deleteCancelledSale(deletingSaleId);
      toast.success('Cancelled sale record deleted successfully');
      setDeletingSaleId(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting cancelled sale:', error);
      toast.error('Failed to delete cancelled sale');
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

  // Filter cancelled sales based on search query
  const filteredCancelledSales = useMemo(() => {
    if (!searchQuery.trim()) return cancelledSales;
    const query = searchQuery.toLowerCase();
    return cancelledSales.filter(sale =>
      sale.client_name.toLowerCase().includes(query) ||
      sale.client_phone?.toLowerCase().includes(query) ||
      sale.project_name.toLowerCase().includes(query) ||
      sale.plot_number.toLowerCase().includes(query) ||
      sale.refund_status?.toLowerCase().includes(query) ||
      sale.outcome_type?.toLowerCase().includes(query)
    );
  }, [cancelledSales, searchQuery]);

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

  // Helper to convert cancelled sale to Client-like object for PaymentHistory
  const openPaymentHistoryForSale = (sale: CancelledSale) => {
    if (!sale.client_id) {
      toast.error('No client record linked to this cancelled sale');
      return;
    }
    const clientLike: Client = {
      id: sale.client_id,
      name: sale.client_name,
      phone: sale.client_phone || '',
      email: null,
      project_name: sale.project_name,
      plot_number: sale.plot_number,
      unit_price: 0,
      number_of_plots: 1,
      total_price: sale.total_price,
      discount: 0,
      total_paid: sale.total_paid,
      balance: 0,
      percent_paid: sale.total_price > 0 ? (sale.total_paid / sale.total_price) * 100 : 0,
      sales_agent: '',
      payment_type: 'installments',
      payment_period: '',
      installment_months: null,
      initial_payment_method: 'Cash',
      completion_date: null,
      next_payment_date: null,
      notes: '',
      status: 'cancelled',
      sale_date: sale.original_sale_date || null,
      commission: null,
      commission_received: null,
      commission_balance: null,
      created_at: sale.created_at,
      updated_at: sale.updated_at,
    };
    setSelectedClientForHistory(clientLike);
    setShowPaymentHistory(true);
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
                <p className="text-base font-bold truncate" title={formatCurrency(summary.totalSaleValue)}>{formatCurrency(summary.totalSaleValue)}</p>
                <p className="text-xs text-muted-foreground">Original Value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <DollarSign className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-base font-bold text-blue-600 truncate" title={formatCurrency(summary.totalCollectedBeforeCancel)}>{formatCurrency(summary.totalCollectedBeforeCancel)}</p>
                <p className="text-xs text-muted-foreground">Was Collected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <RefreshCw className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-base font-bold text-orange-600 truncate" title={formatCurrency(summary.totalRefunded)}>{formatCurrency(summary.totalRefunded)}</p>
                <p className="text-xs text-muted-foreground">Refunded</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-base font-bold text-amber-600 truncate" title={formatCurrency(summary.totalFees)}>{formatCurrency(summary.totalFees)}</p>
                <p className="text-xs text-muted-foreground">Cancel Fees</p>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10 border-green-200">
              <CardContent className="p-3 text-center">
                <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-base font-bold text-green-600 truncate" title={formatCurrency(summary.retainedAmount)}>{formatCurrency(summary.retainedAmount)}</p>
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  Cancelled Sales Details
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, project..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {cancelledSales.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No cancelled sales recorded
                </div>
              ) : filteredCancelledSales.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  {/* Mobile Card View */}
                  <div className="block md:hidden space-y-2 px-4">
                    {filteredCancelledSales.map((sale) => (
                      <div key={sale.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{sale.client_name}</p>
                            <p className="text-xs text-muted-foreground">{sale.client_phone}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {getStatusBadge(sale.refund_status)}
                            {getOutcomeBadge(sale.outcome_type || 'pending')}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                          <div>
                            <p className="text-muted-foreground">Project/Plot</p>
                            <p className="font-medium">{sale.project_name} - {sale.plot_number}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Cancel Date</p>
                            <p className="font-medium">{format(new Date(sale.cancellation_date), 'dd/MM/yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Was Collected</p>
                            <p className="font-medium">{formatCurrency(sale.total_paid)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Net Refund</p>
                            <p className="font-medium text-orange-600">{formatCurrency(sale.net_refund)}</p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-1 pt-2 border-t border-border/50">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openPaymentHistoryForSale(sale)}
                            title="View payment history"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(sale)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setDeletingSaleId(sale.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block px-4 sm:px-0">
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
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCancelledSales.map((sale) => (
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
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openPaymentHistoryForSale(sale)}
                                  title="View payment history"
                                >
                                  <History className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(sale)}
                                  title="Edit refund status"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingSaleId(sale.id)}
                                  title="Delete cancelled sale record"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
          <DialogHeader className="sticky top-0 bg-background pb-4 border-b">
            <DialogTitle>Update Refund Details</DialogTitle>
            <DialogDescription>
              Update refund status and amounts for {editingSale?.client_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <ArrowRight className="w-4 h-4" />
                  <span className="font-medium">Transfer to New Project</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="selectProject">Select Project</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} - {project.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selectPlot">Select Available Plot</Label>
                    <Select 
                      value={selectedPlotId} 
                      onValueChange={(value) => {
                        setSelectedPlotId(value);
                        const plot = availablePlots.find(p => p.id === value);
                        if (plot) {
                          setTransferredPlot(plot.plot_number);
                        }
                      }}
                      disabled={!selectedProjectId || loadingPlots}
                    >
                      <SelectTrigger>
                        {loadingPlots ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading plots...
                          </div>
                        ) : (
                          <SelectValue placeholder={selectedProjectId ? "Select a plot" : "Select project first"} />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlots.length === 0 ? (
                          <SelectItem value="none" disabled>No available plots</SelectItem>
                        ) : (
                          availablePlots.map((plot) => (
                            <SelectItem key={plot.id} value={plot.id}>
                              {plot.plot_number} - {plot.size} ({formatCurrency(plot.price)})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Transfer Amount Summary */}
                {selectedProjectId && selectedPlotId && (
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Amount Collected:</span>
                        <p className="font-bold text-blue-600">{formatCurrency(editingSale?.total_paid || 0)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Net Refund (if any):</span>
                        <p className="font-bold text-orange-600">
                          {formatCurrency(Math.max(0, (parseFloat(refundAmount) || 0) - (parseFloat(cancellationFee) || 0)))}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">New Plot Price:</span>
                        <p className="font-bold">{formatCurrency(availablePlots.find(p => p.id === selectedPlotId)?.price || 0)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Transfer as Initial Payment:</span>
                        <p className="font-bold text-green-600">
                          {formatCurrency((editingSale?.total_paid || 0) - Math.max(0, (parseFloat(refundAmount) || 0) - (parseFloat(cancellationFee) || 0)))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
            <Button variant="outline" onClick={() => setEditingSale(null)} disabled={transferring}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRefund} disabled={transferring}>
              {transferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : outcomeType === 'transferred' ? (
                'Transfer & Create Client'
              ) : (
                'Update Refund'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingSaleId}
        onOpenChange={() => setDeletingSaleId(null)}
        onConfirm={handleDeleteCancelledSale}
        title="Delete Cancelled Sale Record"
        description="Are you sure you want to permanently delete this cancelled sale record? This will remove all associated data from the system. This action cannot be undone."
        confirmText="Delete"
      />

      {/* Payment History Dialog */}
      <PaymentHistory
        open={showPaymentHistory}
        onClose={() => {
          setShowPaymentHistory(false);
          setSelectedClientForHistory(null);
        }}
        client={selectedClientForHistory}
      />
    </div>
  );
};
