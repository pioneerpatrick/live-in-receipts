import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { addCancelledSale } from '@/lib/cancelledSalesStorage';
import { addExpense, generateExpenseReference } from '@/lib/expenseStorage';
import { toast } from 'sonner';

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
  } | null;
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
  
  // Cancellation form state
  const [refundAmount, setRefundAmount] = useState('0');
  const [cancellationFee, setCancellationFee] = useState('0');
  const [refundStatus, setRefundStatus] = useState<'pending' | 'partial' | 'completed' | 'none'>('pending');
  const [cancellationReason, setCancellationReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && projectId) {
      fetchPlots();
    }
  }, [open, projectId, statusFilter]);

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
              .select('id, name, phone, total_price, total_paid, sale_date, project_name')
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

  const openReturnDialog = (plot: Plot) => {
    setReturnPlot(plot);
    // Pre-fill with collected amount
    setRefundAmount((plot.client?.total_paid || 0).toString());
    setCancellationFee('0');
    setRefundStatus('pending');
    setCancellationReason('');
    setNotes('');
  };

  const handleReturnPlot = async () => {
    if (!returnPlot) return;
    setReturning(true);
    try {
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
    } catch (error) {
      console.error('Error returning plot:', error);
      toast.error('Failed to return plot');
    } finally {
      setReturning(false);
    }
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

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
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

          <div className="text-sm text-muted-foreground pt-2 border-t">
            Total: {plots.length} plot{plots.length !== 1 ? 's' : ''}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation Dialog */}
      <Dialog open={!!returnPlot} onOpenChange={() => setReturnPlot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Sale & Return Plot</DialogTitle>
            <DialogDescription>
              Return plot {returnPlot?.plot_number} to available stock and record the cancellation details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {returnPlot?.client && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="font-medium">{returnPlot.client.name}</p>
                <p className="text-sm text-muted-foreground">{returnPlot.client.phone}</p>
                <div className="flex justify-between text-sm mt-2">
                  <span>Sale Value:</span>
                  <span className="font-medium">{formatCurrency(returnPlot.client.total_price || returnPlot.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Amount Paid:</span>
                  <span className="font-medium text-blue-600">{formatCurrency(returnPlot.client.total_paid || 0)}</span>
                </div>
              </div>
            )}

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
              <Input
                id="reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g., Client request, Financial issues"
              />
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnPlot(null)}>
              Cancel
            </Button>
            <Button onClick={handleReturnPlot} disabled={returning} variant="destructive">
              {returning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
