import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Payment } from '@/types/client';
import { Loader2 } from 'lucide-react';

interface EditPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  payment: Payment | null;
  onSave: (paymentId: string, updates: Partial<Payment>, originalAmount: number) => Promise<void>;
}

export const EditPaymentDialog = ({ open, onClose, payment, onSave }: EditPaymentDialogProps) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [agentName, setAgentName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (payment) {
      setAmount(payment.amount.toString());
      setPaymentMethod(payment.payment_method);
      setPaymentDate(new Date(payment.payment_date).toISOString().split('T')[0]);
      setAgentName(payment.agent_name || '');
      setNotes(payment.notes || '');
    }
  }, [payment]);

  const handleSave = async () => {
    if (!payment) return;
    
    setSaving(true);
    try {
      const newAmount = parseFloat(amount);
      const amountDifference = newAmount - payment.amount;
      const newBalance = payment.new_balance - amountDifference;
      
      await onSave(payment.id, {
        amount: newAmount,
        payment_method: paymentMethod,
        payment_date: new Date(paymentDate).toISOString(),
        agent_name: agentName || null,
        notes: notes || null,
        new_balance: newBalance,
      }, payment.amount);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="receipt">Receipt Number</Label>
            <Input id="receipt" value={payment.receipt_number} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent">Agent Name</Label>
            <Input
              id="agent"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Agent name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !amount || !paymentDate}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
