import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Client, Payment, ReceiptData } from '@/types/client';
import { getClientPayments, formatCurrency, updatePayment, deletePayment, updateClient } from '@/lib/supabaseStorage';
import { generatePDFReceipt } from '@/lib/pdfGenerator';
import { EditPaymentDialog } from '@/components/EditPaymentDialog';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Loader2, Printer, Pencil, Trash2 } from 'lucide-react';
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

  const handleEditPayment = async (paymentId: string, updates: Partial<Payment>) => {
    if (!client) return;
    
    try {
      const originalPayment = payments.find(p => p.id === paymentId);
      if (!originalPayment) return;

      const amountDifference = (updates.amount || originalPayment.amount) - originalPayment.amount;
      
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
        onClientUpdated?.();
      }

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
      
      await loadPayments();
      onClientUpdated?.();
      toast.success('Payment deleted successfully!');
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
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Payment History - {client.name}
              {isAdmin && (
                <Badge variant="secondary" className="ml-2">Admin</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Client Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Project</p>
              <p className="font-medium">{client.project_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plot Number</p>
              <p className="font-medium">{client.plot_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Price</p>
              <p className="font-medium">{formatCurrency(client.total_price - client.discount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="font-medium text-primary">{formatCurrency(client.balance)}</p>
            </div>
          </div>

          {/* Payment Progress */}
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-muted rounded-full h-3">
              <div 
                className="bg-primary h-3 rounded-full transition-all" 
                style={{ width: `${Math.min(client.percent_paid ?? 0, 100)}%` }}
              />
            </div>
            <Badge variant="secondary" className="text-sm">
              {(client.percent_paid ?? 0).toFixed(1)}% Paid
            </Badge>
          </div>

          {/* Payments Table */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No payment records found for this client.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Prev. Balance</TableHead>
                    <TableHead className="text-right">New Balance</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">
                        {payment.receipt_number}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(payment.payment_date)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.payment_method}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(payment.previous_balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(payment.new_balance)}
                      </TableCell>
                      <TableCell>{payment.agent_name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePrintReceipt(payment)}
                                  className="h-8 w-8"
                                >
                                  <Printer className="h-4 w-4" />
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
                                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Pencil className="h-4 w-4" />
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
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
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
            )}
          </ScrollArea>

          {/* Summary Footer */}
          {payments.length > 0 && (
            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {payments.length} payment{payments.length !== 1 ? 's' : ''} recorded
              </p>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
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
