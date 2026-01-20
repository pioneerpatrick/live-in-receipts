import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Client, Payment, ReceiptData } from '@/types/client';
import { getClientPayments, formatCurrency, updatePayment, deletePayment, updateClient, returnPlotToStock } from '@/lib/supabaseStorage';
import { generatePDFReceipt, generatePaymentHistoryPDF } from '@/lib/pdfGenerator';
import { EditPaymentDialog } from '@/components/EditPaymentDialog';
import { useAuth } from '@/hooks/useAuth';
import { logActivity } from '@/lib/activityLogger';
import { sendPaymentUpdateEmail } from '@/lib/emailService';
import { FileText, Loader2, Printer, Pencil, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentHistoryProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  onClientUpdated?: () => void;
}

export const PaymentHistory = ({ open, onClose, client, onClientUpdated }: PaymentHistoryProps) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (open && client) {
      loadPayments();
    }
  }, [open, client]);

  const loadPayments = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const data = await getClientPayments(client.id);
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrintReceipt = async (payment: Payment) => {
    if (!client) return;

    const discountedPrice = client.total_price - client.discount;
    const totalPaidAtPayment = discountedPrice - payment.new_balance;

    const receiptData: ReceiptData = {
      receiptNumber: payment.receipt_number,
      date: new Date(payment.payment_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone || '',
      projectName: client.project_name,
      plotNumber: client.plot_number,
      totalPrice: client.total_price,
      discount: client.discount,
      discountedPrice: discountedPrice,
      previousBalance: payment.previous_balance,
      currentPayment: payment.amount,
      totalPaid: totalPaidAtPayment,
      remainingBalance: payment.new_balance,
      paymentMethod: payment.payment_method,
      agentName: payment.agent_name || client.sales_agent || '',
      authorizedBy: payment.authorized_by || '',
    };

    await generatePDFReceipt(receiptData);
    toast.success(`Receipt ${payment.receipt_number} generated!`);
  };

  const handlePrintAllHistory = async () => {
    if (!client || payments.length === 0) return;
    
    await generatePaymentHistoryPDF(client, payments);
    toast.success('Payment history PDF generated!');
  };

  const handleEditPayment = async (paymentId: string, updates: Partial<Payment>, originalAmount: number) => {
    if (!client) return;
    
    try {
      const amountDifference = (updates.amount || originalAmount) - originalAmount;
      
      // Update payment record
      await updatePayment(paymentId, updates);
      
      // Update client's total_paid and balance if amount changed
      if (amountDifference !== 0) {
        const newTotalPaid = client.total_paid + amountDifference;
        const newBalance = client.balance - amountDifference;
        await updateClient(client.id, {
          total_paid: newTotalPaid,
          balance: newBalance,
        });
        
        // Log activity
        await logActivity({
          action: 'payment_updated',
          entityType: 'payment',
          entityId: paymentId,
          details: {
            client_name: client.name,
            old_amount: originalAmount,
            new_amount: updates.amount,
          },
        });

        // Send email notification to client if email available
        const clientEmail = client.phone?.includes('@') ? client.phone : undefined;
        const payment = payments.find(p => p.id === paymentId);
        if (clientEmail && payment) {
          sendPaymentUpdateEmail(clientEmail, {
            clientName: client.name,
            projectName: client.project_name,
            plotNumber: client.plot_number,
            receiptNumber: payment.receipt_number,
            oldAmount: originalAmount,
            newAmount: updates.amount || originalAmount,
            newBalance: newBalance,
          }).catch(err => console.error('Failed to send payment update email:', err));
        }
      }
      
      onClientUpdated?.();
      await loadPayments();
      toast.success('Payment updated successfully!');
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    }
  };

  const handleDeletePayment = async () => {
    if (!deletingPayment || !client) return;
    
    setDeleteLoading(true);
    try {
      // Restore the payment amount to client's balance
      const newTotalPaid = client.total_paid - deletingPayment.amount;
      const newBalance = client.balance + deletingPayment.amount;
      
      await deletePayment(deletingPayment.id);
      await updateClient(client.id, {
        total_paid: newTotalPaid,
        balance: newBalance,
      });
      
      // Check if this was the last payment - if so, return plot to stock
      const remainingPayments = payments.filter(p => p.id !== deletingPayment.id);
      if (remainingPayments.length === 0) {
        try {
          await returnPlotToStock(client.id);
          toast.success('Payment deleted and plot returned to available stock!');
        } catch (plotError) {
          console.error('Error returning plot to stock:', plotError);
          toast.success('Payment deleted! (Note: Could not update plot status)');
        }
      } else {
        toast.success('Payment deleted successfully!');
      }
      
      await loadPayments();
      onClientUpdated?.();
      setDeletingPayment(null);
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment. Admin access required.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!client) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">Payment History - {client.name}</span>
              {isAdmin && (
                <Badge variant="secondary" className="text-xs">Admin</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Client Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg text-xs sm:text-sm">
            <div className="min-w-0">
              <p className="text-muted-foreground">Project</p>
              <p className="font-medium truncate">{client.project_name}</p>
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground">Plot Number</p>
              <p className="font-medium">{client.plot_number}</p>
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground">Total Price</p>
              <p className="font-medium">{formatCurrency(client.total_price - client.discount)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground">Current Balance</p>
              <p className="font-medium text-primary">{formatCurrency(client.balance)}</p>
            </div>
          </div>

          {/* Payment Progress */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-1 bg-muted rounded-full h-2 sm:h-3">
              <div 
                className="bg-primary h-2 sm:h-3 rounded-full transition-all" 
                style={{ width: `${Math.min(client.percent_paid ?? 0, 100)}%` }}
              />
            </div>
            <Badge variant="secondary" className="text-xs sm:text-sm flex-shrink-0">
              {(client.percent_paid ?? 0).toFixed(1)}% Paid
            </Badge>
          </div>

          {/* Payments List */}
          <div className="flex-1 overflow-auto min-h-[200px] max-h-[400px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No payment records found for this client.
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block md:hidden space-y-2 p-1">
                  {payments.map((payment) => (
                    <div key={payment.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-muted-foreground">{payment.receipt_number}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(payment.payment_date)}</p>
                        </div>
                        <p className="font-medium text-primary text-sm">{formatCurrency(payment.amount)}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="outline" className="text-xs">{payment.payment_method}</Badge>
                        <span className="text-muted-foreground">{payment.agent_name || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                        <div>
                          <span className="text-muted-foreground">Balance: </span>
                          <span>{formatCurrency(payment.previous_balance)} → {formatCurrency(payment.new_balance)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintReceipt(payment)}
                            className="h-7 w-7 p-0"
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingPayment(payment)}
                                className="h-7 w-7 p-0 text-blue-600"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingPayment(payment)}
                                className="h-7 w-7 p-0 text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs px-2 w-24">Receipt No.</TableHead>
                        <TableHead className="text-xs px-2">Date</TableHead>
                        <TableHead className="text-right text-xs px-2">Amount</TableHead>
                        <TableHead className="text-xs px-2 w-20">Method</TableHead>
                        <TableHead className="text-right text-xs px-2 hidden lg:table-cell">Prev. Bal</TableHead>
                        <TableHead className="text-right text-xs px-2">Balance</TableHead>
                        <TableHead className="text-xs px-2 hidden lg:table-cell">Agent</TableHead>
                        <TableHead className="text-center text-xs px-1 w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-[10px] px-2 truncate">
                            {payment.receipt_number}
                          </TableCell>
                          <TableCell className="text-xs px-2">
                            {new Date(payment.payment_date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit'
                            })}
                          </TableCell>
                          <TableCell className="text-right font-medium text-primary text-xs px-2">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="px-2">
                            <Badge variant="outline" className="text-[10px] px-1">{payment.payment_method}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-xs px-2 hidden lg:table-cell">
                            {formatCurrency(payment.previous_balance)}
                          </TableCell>
                          <TableCell className="text-right text-xs px-2">
                            {formatCurrency(payment.new_balance)}
                          </TableCell>
                          <TableCell className="text-xs px-2 truncate hidden lg:table-cell">{payment.agent_name || '-'}</TableCell>
                          <TableCell className="px-1">
                            <div className="flex items-center justify-center gap-0">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handlePrintReceipt(payment)}
                                      className="h-6 w-6"
                                    >
                                      <Printer className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Print Receipt</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {isAdmin && (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setEditingPayment(payment)}
                                          className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Edit Payment</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setDeletingPayment(payment)}
                                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete Payment</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          {/* Summary Footer */}
          {payments.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-3 sm:pt-4 border-t">
              <p className="text-xs sm:text-sm text-muted-foreground">
                {payments.length} payment{payments.length !== 1 ? 's' : ''} recorded
              </p>
              <div className="text-right">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Collected</p>
                <p className="text-base sm:text-lg font-bold text-primary">
                  {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {payments.length > 0 && (
              <Button variant="secondary" onClick={handlePrintAllHistory} size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Print All History
              </Button>
            )}
            <Button variant="outline" onClick={onClose} size="sm">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EditPaymentDialog
        open={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        payment={editingPayment}
        onSave={handleEditPayment}
      />

      <AlertDialog open={!!deletingPayment} onOpenChange={() => setDeletingPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This will restore{' '}
              <span className="font-semibold">{deletingPayment && formatCurrency(deletingPayment.amount)}</span>{' '}
              to the client's balance. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
