import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Expense, EXPENSE_CATEGORIES } from '@/types/expense';
import { Client } from '@/types/client';
import { generateExpenseReference } from '@/lib/expenseStorage';
import { format } from 'date-fns';

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => void;
  expense?: Expense | null;
  clients: Client[];
  agents: string[];
}

const PAYMENT_METHODS = ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque'];

export const ExpenseForm = ({ open, onClose, onSubmit, expense, clients, agents }: ExpenseFormProps) => {
  const [formData, setFormData] = useState({
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    category: '',
    description: '',
    amount: '',
    payment_method: 'Cash',
    recipient: '',
    reference_number: '',
    agent_id: '',
    client_id: '',
    is_commission_payout: false,
    notes: '',
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        expense_date: format(new Date(expense.expense_date), 'yyyy-MM-dd'),
        category: expense.category,
        description: expense.description,
        amount: expense.amount.toString(),
        payment_method: expense.payment_method,
        recipient: expense.recipient || '',
        reference_number: expense.reference_number || '',
        agent_id: expense.agent_id || '',
        client_id: expense.client_id || '',
        is_commission_payout: expense.is_commission_payout,
        notes: expense.notes || '',
      });
    } else {
      setFormData({
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        category: '',
        description: '',
        amount: '',
        payment_method: 'Cash',
        recipient: '',
        reference_number: generateExpenseReference(),
        agent_id: '',
        client_id: '',
        is_commission_payout: false,
        notes: '',
      });
    }
  }, [expense, open]);

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      category: value,
      is_commission_payout: value === 'Commission Payout',
    }));
  };

  const handleAgentChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      agent_id: value,
      recipient: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) return;
    
    onSubmit({
      expense_date: new Date(formData.expense_date).toISOString(),
      category: formData.category,
      description: formData.description,
      amount,
      payment_method: formData.payment_method,
      recipient: formData.recipient || null,
      reference_number: formData.reference_number || null,
      agent_id: formData.is_commission_payout ? formData.agent_id : null,
      client_id: formData.client_id || null,
      is_commission_payout: formData.is_commission_payout,
      notes: formData.notes || null,
      created_by: null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Reference #</Label>
              <Input
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="EXP-XXXXXX"
              />
            </div>
          </div>

          <div>
            <Label>Category *</Label>
            <Select value={formData.category} onValueChange={handleCategoryChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.category === 'Commission Payout' && (
            <div className="p-3 bg-primary/10 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_commission_payout}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_commission_payout: checked }))}
                />
                <Label>Mark as Commission Payout</Label>
              </div>
              
              <div>
                <Label>Select Agent *</Label>
                <Select value={formData.agent_id} onValueChange={handleAgentChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Related Client (Optional)</Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label>Description *</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the expense"
              required
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount (KES) *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0"
                min="1"
                required
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select 
                value={formData.payment_method} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.category !== 'Commission Payout' && (
            <div>
              <Label>Recipient</Label>
              <Input
                value={formData.recipient}
                onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
                placeholder="Who received the payment"
                maxLength={100}
              />
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {expense ? 'Update' : 'Add'} Expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
