import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Client, Payment } from '@/types/client';
import { getClientPayments, formatCurrency } from '@/lib/supabaseStorage';
import { FileText, Loader2 } from 'lucide-react';

interface PaymentHistoryProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
}

export const PaymentHistory = ({ open, onClose, client }: PaymentHistoryProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

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

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payment History - {client.name}
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
                  <TableHead>Authorized By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment, index) => (
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
                    <TableCell>{payment.authorized_by || '-'}</TableCell>
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
  );
};
