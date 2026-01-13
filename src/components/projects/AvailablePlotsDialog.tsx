import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotateCcw, Loader2, ArrowRightLeft, FileSpreadsheet, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, generateReceiptNumber, addPayment } from '@/lib/supabaseStorage';
import { addCancelledSale } from '@/lib/cancelledSalesStorage';
import { addExpense, generateExpenseReference } from '@/lib/expenseStorage';
import { sellPlot, returnPlot as returnPlotToStock } from '@/lib/projectStorage';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Plot {
  id: string;
  plot_number: string;
  size: string;
  price: number;
  status: string;
  project_id: string;
  client_id: string | null;
  client?: { 
    id: string;
    name: string; 
    phone: string | null;
    total_price: number;
    total_paid: number;
    sale_date: string | null;
    project_name: string;
    sales_agent: string | null;
  } | null;
}

interface Project {
  id: string;
  name: string;
  location: string;
}

interface AvailablePlotForTransfer {
  id: string;
  plot_number: string;
  size: string;
  price: number;
  project_id: string;
  project_name: string;
}

interface AvailablePlotsDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  projectName: string;
  statusFilter: 'available' | 'sold' | 'reserved' | 'all';
  isAdmin: boolean;
  onPlotReturned?: () => void;
}

export function AvailablePlotsDialog({ 
  open, 
  onClose, 
  projectId, 
  projectName, 
  statusFilter,
  isAdmin,
  onPlotReturned 
}: AvailablePlotsDialogProps) {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(false);
  const [returnPlot, setReturnPlot] = useState<Plot | null>(null);
  const [returning, setReturning] = useState(false);
  
  // Cancellation type: 'cancel' or 'transfer'
  const [cancellationType, setCancellationType] = useState<'cancel' | 'transfer'>('cancel');
  
  // Cancellation form state
  const [refundAmount, setRefundAmount] = useState('0');
  const [cancellationFee, setCancellationFee] = useState('0');
  const [refundStatus, setRefundStatus] = useState<'pending' | 'partial' | 'completed' | 'none'>('pending');
  const [cancellationReason, setCancellationReason] = useState('');
  const [notes, setNotes] = useState('');
  
  // Transfer state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [availablePlotsForTransfer, setAvailablePlotsForTransfer] = useState<AvailablePlotForTransfer[]>([]);
  const [selectedTransferPlotId, setSelectedTransferPlotId] = useState<string>('');
  const [loadingTransferPlots, setLoadingTransferPlots] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      fetchPlots();
    }
  }, [open, projectId, statusFilter]);

  useEffect(() => {
    if (returnPlot) {
      fetchProjects();
    }
  }, [returnPlot]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchAvailablePlotsForTransfer(selectedProjectId);
    } else {
      setAvailablePlotsForTransfer([]);
      setSelectedTransferPlotId('');
    }
  }, [selectedProjectId]);

  const fetchPlots = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('plots')
        .select(`
          id,
          plot_number,
          size,
          price,
          status,
          project_id,
          client_id
        `)
        .eq('project_id', projectId)
        .order('plot_number');

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Fetch client details for sold/reserved plots
      const plotsWithClients = await Promise.all(
        (data || []).map(async (plot) => {
          if (plot.client_id) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('id, name, phone, total_price, total_paid, sale_date, project_name, sales_agent')
              .eq('id', plot.client_id)
              .single();
            return { ...plot, client: clientData };
          }
          return { ...plot, client: null };
        })
      );

      setPlots(plotsWithClients);
    } catch (error) {
      console.error('Error fetching plots:', error);
      toast.error('Failed to load plots');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, location')
        .order('name');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchAvailablePlotsForTransfer = async (projectIdToFetch: string) => {
    setLoadingTransferPlots(true);
    try {
      const { data, error } = await supabase
        .from('plots')
        .select(`
          id,
          plot_number,
          size,
          price,
          project_id,
          projects(name)
        `)
        .eq('project_id', projectIdToFetch)
        .eq('status', 'available')
        .order('plot_number');
      
      if (error) throw error;
      
      setAvailablePlotsForTransfer(
        (data || []).map(p => ({
          id: p.id,
          plot_number: p.plot_number,
          size: p.size,
          price: p.price,
          project_id: p.project_id,
          project_name: (p.projects as any)?.name || ''
        }))
      );
    } catch (error) {
      console.error('Error fetching available plots for transfer:', error);
      toast.error('Failed to load available plots');
    } finally {
      setLoadingTransferPlots(false);
    }
  };

  const openReturnDialog = (plot: Plot) => {
    setReturnPlot(plot);
    // Pre-fill with collected amount
    setRefundAmount((plot.client?.total_paid || 0).toString());
    setCancellationFee('0');
    setRefundStatus('pending');
    setCancellationType('cancel');
    setCancellationReason('');
    setNotes('');
    setSelectedProjectId('');
    setSelectedTransferPlotId('');
  };

  const handleReturnPlot = async () => {
    if (!returnPlot) return;
    setReturning(true);
    
    try {
      if (cancellationType === 'transfer') {
        await handleTransfer();
      } else {
        await handleCancellation();
      }
    } catch (error) {
      console.error('Error processing:', error);
      toast.error('Failed to process request');
    } finally {
      setReturning(false);
    }
  };

  const handleCancellation = async () => {
    if (!returnPlot) return;
    
    const refund = parseFloat(refundAmount) || 0;
    const fee = parseFloat(cancellationFee) || 0;
    const netRefund = Math.max(0, refund - fee);

    // Record the cancelled sale
    if (returnPlot.client) {
      await addCancelledSale({
        client_id: returnPlot.client.id,
        client_name: returnPlot.client.name,
        client_phone: returnPlot.client.phone,
        project_name: returnPlot.client.project_name || projectName,
        plot_number: returnPlot.plot_number,
        original_sale_date: returnPlot.client.sale_date,
        cancellation_date: new Date().toISOString(),
        total_price: returnPlot.client.total_price || returnPlot.price,
        total_paid: returnPlot.client.total_paid || 0,
        refund_amount: refund,
        refund_status: refundStatus,
        cancellation_fee: fee,
        net_refund: netRefund,
        cancellation_reason: cancellationReason || null,
        notes: notes || null,
      });

      // Create refund expense if refund is being processed
      if (netRefund > 0 && (refundStatus === 'completed' || refundStatus === 'partial')) {
        await addExpense({
          expense_date: new Date().toISOString(),
          category: 'Refund',
          description: `Refund for cancelled sale - ${returnPlot.client.name} (${returnPlot.plot_number})`,
          amount: netRefund,
          payment_method: 'Cash',
          recipient: returnPlot.client.name,
          reference_number: generateExpenseReference(),
          agent_id: null,
          client_id: returnPlot.client.id,
          is_commission_payout: false,
          notes: `Cancelled sale refund. Original sale: ${formatCurrency(returnPlot.client.total_price || returnPlot.price)}, Paid: ${formatCurrency(returnPlot.client.total_paid || 0)}, Refund: ${formatCurrency(refund)}, Fee: ${formatCurrency(fee)}. ${cancellationReason ? `Reason: ${cancellationReason}` : ''}`,
          created_by: null,
        });
      }
    }

    // Update the plot status
    const { error } = await supabase
      .from('plots')
      .update({ status: 'available', client_id: null, sold_at: null })
      .eq('id', returnPlot.id);

    if (error) throw error;

    // Update client status to cancelled
    if (returnPlot.client_id) {
      await supabase
        .from('clients')
        .update({ status: 'cancelled' })
        .eq('id', returnPlot.client_id);
    }

    toast.success('Plot returned to available status and sale cancelled');
    setReturnPlot(null);
    fetchPlots();
    onPlotReturned?.();
  };

  const handleTransfer = async () => {
    if (!returnPlot || !selectedTransferPlotId || !returnPlot.client) {
      toast.error('Please select a plot to transfer to');
      return;
    }

    const selectedPlot = availablePlotsForTransfer.find(p => p.id === selectedTransferPlotId);
    if (!selectedPlot) {
      toast.error('Selected plot not found');
      return;
    }

    const oldClient = returnPlot.client;
    const amountPaid = oldClient.total_paid || 0;
    const newPlotPrice = selectedPlot.price;
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    
    // Calculate balance/overpayment
    const remainingAfterTransfer = amountPaid - newPlotPrice;
    const isOverpayment = remainingAfterTransfer > 0;
    const newClientBalance = isOverpayment ? 0 : Math.abs(remainingAfterTransfer);
    const refundFromTransfer = isOverpayment ? remainingAfterTransfer : 0;

    // Create new client for the new plot
    const { data: newClient, error: newClientError } = await supabase
      .from('clients')
      .insert({
        name: oldClient.name,
        phone: oldClient.phone,
        project_name: selectedProject?.name || selectedPlot.project_name,
        plot_number: selectedPlot.plot_number,
        unit_price: newPlotPrice,
        number_of_plots: 1,
        total_price: newPlotPrice,
        discount: 0,
        total_paid: Math.min(amountPaid, newPlotPrice), // Can't pay more than the price
        balance: newClientBalance,
        sales_agent: oldClient.sales_agent || '',
        payment_type: newClientBalance > 0 ? 'installments' : 'cash',
        payment_period: '',
        installment_months: null,
        initial_payment_method: 'Transfer',
        status: newClientBalance === 0 ? 'completed' : 'ongoing',
        sale_date: new Date().toISOString().split('T')[0],
        notes: `Transferred from ${oldClient.project_name} - ${returnPlot.plot_number}. Original amount paid: ${formatCurrency(amountPaid)}`,
      })
      .select()
      .single();

    if (newClientError) throw newClientError;

    // Mark the new plot as sold
    await sellPlot(selectedTransferPlotId, newClient.id);

    // Add payment record for the transfer
    const receiptNum = await generateReceiptNumber();
    await addPayment({
      client_id: newClient.id,
      amount: Math.min(amountPaid, newPlotPrice),
      payment_method: 'Transfer',
      payment_date: new Date().toISOString(),
      previous_balance: newPlotPrice,
      new_balance: newClientBalance,
      receipt_number: receiptNum,
      agent_name: oldClient.sales_agent || 'System',
      notes: `Transfer from cancelled sale: ${oldClient.project_name} - ${returnPlot.plot_number}`,
    });

    // Return old plot to available
    await returnPlotToStock(returnPlot.id);

    // Mark old client as cancelled
    await supabase
      .from('clients')
      .update({ status: 'cancelled' })
      .eq('id', oldClient.id);

    // Record in cancelled sales with transfer info
    const transferRefundStatus = refundFromTransfer > 0 ? 'pending' : 'none';
    await addCancelledSale({
      client_id: oldClient.id,
      client_name: oldClient.name,
      client_phone: oldClient.phone,
      project_name: oldClient.project_name || projectName,
      plot_number: returnPlot.plot_number,
      original_sale_date: oldClient.sale_date,
      cancellation_date: new Date().toISOString(),
      total_price: oldClient.total_price || returnPlot.price,
      total_paid: amountPaid,
      refund_amount: refundFromTransfer,
      refund_status: transferRefundStatus,
      cancellation_fee: 0,
      net_refund: refundFromTransfer,
      cancellation_reason: `Transfer to ${selectedProject?.name || selectedPlot.project_name} - Plot ${selectedPlot.plot_number}`,
      notes: `Payment of ${formatCurrency(amountPaid)} transferred as initial payment to new plot (Price: ${formatCurrency(newPlotPrice)}). ${refundFromTransfer > 0 ? `Overpayment of ${formatCurrency(refundFromTransfer)} pending refund.` : 'No refund required.'}`,
    });

    // Create refund expense if there's overpayment
    if (refundFromTransfer > 0) {
      await addExpense({
        expense_date: new Date().toISOString(),
        category: 'Refund',
        description: `Overpayment refund from transfer - ${oldClient.name}`,
        amount: refundFromTransfer,
        payment_method: 'Cash',
        recipient: oldClient.name,
        reference_number: generateExpenseReference(),
        agent_id: null,
        client_id: oldClient.id,
        is_commission_payout: false,
        notes: `Transfer overpayment. Old plot: ${returnPlot.plot_number} (${formatCurrency(oldClient.total_price)}). New plot: ${selectedPlot.plot_number} (${formatCurrency(newPlotPrice)}). Paid: ${formatCurrency(amountPaid)}. Refund: ${formatCurrency(refundFromTransfer)}`,
        created_by: null,
      });
    }

    const successMessage = refundFromTransfer > 0 
      ? `Transfer complete! Overpayment of ${formatCurrency(refundFromTransfer)} recorded for refund.`
      : `Transfer complete! ${oldClient.name} now owns Plot ${selectedPlot.plot_number} in ${selectedProject?.name || selectedPlot.project_name}.`;
    
    toast.success(successMessage);
    setReturnPlot(null);
    fetchPlots();
    onPlotReturned?.();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Available</Badge>;
      case 'sold':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Sold</Badge>;
      case 'reserved':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Reserved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDialogTitle = () => {
    switch (statusFilter) {
      case 'available': return `Available Plots - ${projectName}`;
      case 'sold': return `Sold Plots - ${projectName}`;
      case 'reserved': return `Reserved Plots - ${projectName}`;
      default: return `All Plots - ${projectName}`;
    }
  };

  const exportToExcel = () => {
    const exportData = plots.map(plot => ({
      'Plot Number': plot.plot_number,
      'Size': plot.size,
      'Price (KSH)': plot.price,
      'Status': plot.status.charAt(0).toUpperCase() + plot.status.slice(1),
      ...(statusFilter !== 'available' && {
        'Client Name': plot.client?.name || '-',
        'Client Phone': plot.client?.phone || '-',
        'Total Paid': plot.client?.total_paid || 0,
        'Balance': (plot.client?.total_price || plot.price) - (plot.client?.total_paid || 0),
      }),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plots');
    
    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...exportData.map(row => String((row as any)[key] || '').length))
    }));
    ws['!cols'] = colWidths;

    const fileName = `${projectName.replace(/\s+/g, '_')}_${statusFilter}_plots_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Excel file downloaded successfully');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(0, 150, 136);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(getDialogTitle(), pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 23, { align: 'center' });

    // Table data
    const headers = statusFilter === 'available' 
      ? [['Plot Number', 'Size', 'Price', 'Status']]
      : [['Plot No.', 'Size', 'Price', 'Status', 'Client', 'Phone', 'Paid', 'Balance']];

    const body = plots.map(plot => {
      const baseData = [
        plot.plot_number,
        plot.size,
        formatCurrency(plot.price),
        plot.status.charAt(0).toUpperCase() + plot.status.slice(1),
      ];
      
      if (statusFilter !== 'available') {
        baseData.push(
          plot.client?.name || '-',
          plot.client?.phone || '-',
          formatCurrency(plot.client?.total_paid || 0),
          formatCurrency((plot.client?.total_price || plot.price) - (plot.client?.total_paid || 0))
        );
      }
      
      return baseData;
    });

    autoTable(doc, {
      head: headers,
      body: body,
      startY: 40,
      theme: 'striped',
      headStyles: { 
        fillColor: [0, 150, 136],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: { 
        fontSize: 8,
      },
      alternateRowStyles: { 
        fillColor: [245, 245, 245] 
      },
      columnStyles: statusFilter === 'available' ? {
        0: { cellWidth: 35 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
      } : {
        0: { cellWidth: 20 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 18 },
        4: { cellWidth: 35 },
        5: { cellWidth: 25 },
        6: { cellWidth: 22 },
        7: { cellWidth: 22 },
      },
    });

    // Footer with summary
    const finalY = (doc as any).lastAutoTable?.finalY || 40;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.text(`Total: ${plots.length} plot${plots.length !== 1 ? 's' : ''}`, 14, finalY + 10);

    const fileName = `${projectName.replace(/\s+/g, '_')}_${statusFilter}_plots_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success('PDF file downloaded successfully');
  };

  const selectedTransferPlot = availablePlotsForTransfer.find(p => p.id === selectedTransferPlotId);
  const amountPaid = returnPlot?.client?.total_paid || 0;
  const transferBalance = selectedTransferPlot ? amountPaid - selectedTransferPlot.price : 0;


  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 max-h-[55vh] [&>[data-radix-scroll-area-viewport]]:max-h-[55vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : plots.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No {statusFilter !== 'all' ? statusFilter : ''} plots found in this project.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plot Number</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    {(statusFilter === 'sold' || statusFilter === 'reserved' || statusFilter === 'all') && (
                      <TableHead>Client</TableHead>
                    )}
                    {isAdmin && (statusFilter === 'sold' || statusFilter === 'reserved' || statusFilter === 'all') && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plots.map((plot) => (
                    <TableRow key={plot.id}>
                      <TableCell className="font-medium">{plot.plot_number}</TableCell>
                      <TableCell>{plot.size}</TableCell>
                      <TableCell>{formatCurrency(plot.price)}</TableCell>
                      <TableCell>{getStatusBadge(plot.status)}</TableCell>
                      {(statusFilter === 'sold' || statusFilter === 'reserved' || statusFilter === 'all') && (
                        <TableCell>
                          {plot.client ? (
                            <div>
                              <p className="font-medium text-sm">{plot.client.name}</p>
                              {plot.client.phone && (
                                <p className="text-xs text-muted-foreground">{plot.client.phone}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      {isAdmin && (statusFilter === 'sold' || statusFilter === 'reserved' || statusFilter === 'all') && (
                        <TableCell className="text-right">
                          {(plot.status === 'sold' || plot.status === 'reserved') && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openReturnDialog(plot)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Cancel Sale
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              Total: {plots.length} plot{plots.length !== 1 ? 's' : ''}
            </div>
            {plots.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToExcel}
                  className="text-green-700 hover:text-green-800 hover:bg-green-50"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToPDF}
                  className="text-red-700 hover:text-red-800 hover:bg-red-50"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation / Transfer Dialog */}
      <Dialog open={!!returnPlot} onOpenChange={() => setReturnPlot(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Cancel Sale / Transfer Plot</DialogTitle>
            <DialogDescription>
              Choose to cancel the sale and return plot {returnPlot?.plot_number} to stock, or transfer the client to another plot.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 max-h-[50vh] [&>[data-radix-scroll-area-viewport]]:max-h-[50vh] pr-4">
            <div className="space-y-4">
              {returnPlot?.client && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="font-medium">{returnPlot.client.name}</p>
                  <p className="text-sm text-muted-foreground">{returnPlot.client.phone}</p>
                  <div className="flex justify-between text-sm mt-2">
                    <span>Current Plot:</span>
                    <span className="font-medium">{returnPlot.plot_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Sale Value:</span>
                    <span className="font-medium">{formatCurrency(returnPlot.client.total_price || returnPlot.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Amount Paid:</span>
                    <span className="font-medium text-blue-600">{formatCurrency(returnPlot.client.total_paid || 0)}</span>
                  </div>
                </div>
              )}

              {/* Cancellation Type Selection */}
              <div className="space-y-3">
                <Label>Action Type</Label>
                <RadioGroup value={cancellationType} onValueChange={(v) => setCancellationType(v as 'cancel' | 'transfer')}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="cancel" id="cancel" />
                    <Label htmlFor="cancel" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-destructive" />
                        <span className="font-medium">Cancel Sale</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Return plot to stock and process refund if applicable</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="transfer" id="transfer" />
                    <Label htmlFor="transfer" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-primary" />
                        <span className="font-medium">Transfer to Another Project</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Move client to a different plot, payment transfers as initial payment</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {cancellationType === 'cancel' && (
                <>
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
                      <Label htmlFor="cancellationFee">Cancellation Fee</Label>
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
                      <span className="text-sm text-muted-foreground">Net Refund:</span>
                      <span className="text-lg font-bold text-red-600">
                        {formatCurrency(Math.max(0, (parseFloat(refundAmount) || 0) - (parseFloat(cancellationFee) || 0)))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-muted-foreground">Retained:</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency((returnPlot?.client?.total_paid || 0) - Math.max(0, (parseFloat(refundAmount) || 0) - (parseFloat(cancellationFee) || 0)))}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="refundStatus">Refund Status</Label>
                    <Select value={refundStatus} onValueChange={(v) => setRefundStatus(v as typeof refundStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending Refund</SelectItem>
                        <SelectItem value="partial">Partial Refund Made</SelectItem>
                        <SelectItem value="completed">Fully Refunded</SelectItem>
                        <SelectItem value="none">No Refund (Forfeited)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Cancellation Reason</Label>
                    <Select value={cancellationReason} onValueChange={setCancellationReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Client request">Client request</SelectItem>
                        <SelectItem value="Financial issues">Financial issues</SelectItem>
                        <SelectItem value="Relocation">Relocation</SelectItem>
                        <SelectItem value="Dissatisfaction with project">Dissatisfaction with project</SelectItem>
                        <SelectItem value="Transfer to another project">Transfer to another project</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional details..."
                      rows={2}
                    />
                  </div>
                </>
              )}

              {cancellationType === 'transfer' && (
                <>
                  <div className="space-y-2">
                    <Label>Select Project to Transfer To</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} - {project.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedProjectId && (
                    <div className="space-y-2">
                      <Label>Select Available Plot</Label>
                      {loadingTransferPlots ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : availablePlotsForTransfer.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No available plots in this project</p>
                      ) : (
                        <Select value={selectedTransferPlotId} onValueChange={setSelectedTransferPlotId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a plot..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePlotsForTransfer.map(plot => (
                              <SelectItem key={plot.id} value={plot.id}>
                                Plot {plot.plot_number} - {plot.size} - {formatCurrency(plot.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {selectedTransferPlot && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>New Plot Price:</span>
                        <span className="font-medium">{formatCurrency(selectedTransferPlot.price)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Amount to Transfer:</span>
                        <span className="font-medium text-blue-600">{formatCurrency(amountPaid)}</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        {transferBalance > 0 ? (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Overpayment (Refund):</span>
                            <span className="text-lg font-bold text-red-600">{formatCurrency(transferBalance)}</span>
                          </div>
                        ) : transferBalance < 0 ? (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">New Balance Due:</span>
                            <span className="text-lg font-bold text-amber-600">{formatCurrency(Math.abs(transferBalance))}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <span className="text-lg font-bold text-green-600">Fully Paid</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setReturnPlot(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReturnPlot} 
              disabled={returning || (cancellationType === 'transfer' && !selectedTransferPlotId)} 
              variant={cancellationType === 'cancel' ? 'destructive' : 'default'}
            >
              {returning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : cancellationType === 'cancel' ? (
                'Confirm Cancellation'
              ) : (
                'Confirm Transfer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
