import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Expense, EXPENSE_CATEGORIES } from '@/types/expense';
import { Client } from '@/types/client';
import { generateExpenseReference } from '@/lib/expenseStorage';
import { formatCurrency } from '@/lib/supabaseStorage';
import { format } from 'date-fns';
import { User, DollarSign, CheckCircle } from 'lucide-react';

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => void;
  expense?: Expense | null;
  clients: Client[];
  agents: string[];
  commissionExpenses?: Expense[];
}

const PAYMENT_METHODS = ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque'];

interface AgentCommissionData {
  agent: string;
  earned: number;
  paid: number;
  pending: number;
  clientCount: number;
}

export const ExpenseForm = ({ open, onClose, onSubmit, expense, clients, agents, commissionExpenses = [] }: ExpenseFormProps) => {
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

  // Calculate agent commission data
  const agentCommissionData = useMemo((): AgentCommissionData[] => {
    const agentData: { [key: string]: { earned: number; paid: number; clientCount: number } } = {};

    // Calculate earned commissions from clients
    clients.forEach(client => {
      const agent = client.sales_agent || 'Unknown';
      if (!agentData[agent]) {
        agentData[agent] = { earned: 0, paid: 0, clientCount: 0 };
      }
      agentData[agent].earned += client.commission || 0;
      agentData[agent].clientCount += 1;
    });

    // Calculate paid commissions from expenses
    commissionExpenses.forEach(payout => {
      const agent = payout.agent_id || payout.recipient || 'Unknown';
      if (!agentData[agent]) {
        agentData[agent] = { earned: 0, paid: 0, clientCount: 0 };
      }
      agentData[agent].paid += payout.amount;
    });

    return Object.entries(agentData)
      .filter(([, data]) => data.earned > 0 || data.paid > 0)
      .sort(([, a], [, b]) => (b.earned - b.paid) - (a.earned - a.paid))
      .map(([agent, data]) => ({
        agent,
        earned: data.earned,
        paid: data.paid,
        pending: Math.max(0, data.earned - data.paid),
        clientCount: data.clientCount,
      }));
  }, [clients, commissionExpenses]);

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

  const handleAgentSelect = (agent: string, pendingAmount: number) => {
    setFormData(prev => ({
      ...prev,
      agent_id: agent,
      recipient: agent,
      amount: pendingAmount.toString(),
      description: `Commission payout to ${agent}`,
    }));
  };

  const handleAgentChange = (value: string) => {
    const agentData = agentCommissionData.find(a => a.agent === value);
    setFormData(prev => ({
      ...prev,
      agent_id: value,
      recipient: value,
      amount: agentData ? agentData.pending.toString() : prev.amount,
      description: `Commission payout to ${value}`,
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
              
              {/* Agent Commission Summary - Quick Select */}
              {agentCommissionData.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quick Select Agent (with pending commission)</Label>
                  <ScrollArea className="h-[180px] border rounded-lg bg-background">
                    <div className="p-2 space-y-2">
                      {agentCommissionData.map((agent) => (
                        <Card 
                          key={agent.agent}
                          className={`p-3 cursor-pointer transition-all hover:border-primary ${
                            formData.agent_id === agent.agent ? 'border-primary bg-primary/5' : ''
                          }`}
                          onClick={() => handleAgentSelect(agent.agent, agent.pending)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-primary/10 rounded-full">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{agent.agent}</p>
                                <p className="text-xs text-muted-foreground">
                                  {agent.clientCount} client{agent.clientCount !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-amber-600" />
                                <span className={`font-bold text-sm ${agent.pending > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                  {formatCurrency(agent.pending)}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {agent.pending > 0 ? 'pending' : (
                                  <span className="flex items-center gap-0.5 text-green-600">
                                    <CheckCircle className="h-3 w-3" /> Paid
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          {agent.pending > 0 && (
                            <div className="mt-2 pt-2 border-t border-dashed">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Earned: {formatCurrency(agent.earned)}</span>
                                <span>Paid: {formatCurrency(agent.paid)}</span>
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {agentCommissionData.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No agents with pending commissions found.
                  <br />
                  <span className="text-xs">Commission is calculated from client sales.</span>
                </div>
              )}
              
              <div>
                <Label>Or Select Agent Manually *</Label>
                <Select value={formData.agent_id} onValueChange={handleAgentChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => {
                      const agentData = agentCommissionData.find(a => a.agent === agent);
                      return (
                        <SelectItem key={agent} value={agent}>
                          <div className="flex items-center gap-2">
                            <span>{agent}</span>
                            {agentData && agentData.pending > 0 && (
                              <Badge variant="outline" className="text-xs ml-2">
                                {formatCurrency(agentData.pending)} pending
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Related Client (Optional)</Label>
                <Select 
                  value={formData.client_id || "none"} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
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