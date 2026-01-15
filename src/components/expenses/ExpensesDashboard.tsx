import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Client } from '@/types/client';
import { Expense } from '@/types/expense';
import { getExpenses, addExpense, updateExpense, deleteExpense } from '@/lib/expenseStorage';
import { ExpenseList } from './ExpenseList';
import { ExpenseForm } from './ExpenseForm';
import { CommissionReport } from './CommissionReport';
import { toast } from 'sonner';
import { Receipt, Users, Loader2 } from 'lucide-react';

interface ExpensesDashboardProps {
  clients: Client[];
}

export const ExpensesDashboard = ({ clients }: ExpensesDashboardProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState('expenses');

  // Extract unique agents from clients
  const agents = useMemo(() => {
    const agentSet = new Set<string>();
    clients.forEach(c => {
      if (c.sales_agent) agentSet.add(c.sales_agent);
    });
    return Array.from(agentSet).sort();
  }, [clients]);

  // Get commission payout expenses
  const commissionExpenses = useMemo(() => {
    return expenses.filter(e => e.is_commission_payout);
  }, [expenses]);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await getExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = () => {
    setEditingExpense(null);
    setFormOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense(id);
      toast.success('Expense deleted successfully');
      await loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const handleFormSubmit = async (data: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, data);
        toast.success('Expense updated successfully');
      } else {
        await addExpense(data);
        toast.success('Expense added successfully');
      }
      setFormOpen(false);
      setEditingExpense(null);
      await loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
          <TabsTrigger value="expenses" className="flex items-center gap-1">
            <Receipt className="w-4 h-4" />
            <span>Expenses</span>
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>Commissions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-4">
          <ExpenseList
            expenses={expenses}
            onAdd={handleAddExpense}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
          />
        </TabsContent>

        <TabsContent value="commissions" className="mt-4">
          <CommissionReport
            clients={clients}
            expenses={expenses}
          />
        </TabsContent>
      </Tabs>

      <ExpenseForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={handleFormSubmit}
        expense={editingExpense}
        clients={clients}
        agents={agents}
        commissionExpenses={commissionExpenses}
      />
    </div>
  );
};
