import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Expense, EXPENSE_CATEGORIES } from '@/types/expense';
import { formatCurrency } from '@/lib/supabaseStorage';
import { format } from 'date-fns';
import { Plus, Search, Edit2, Trash2, Receipt, Users } from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export const ExpenseList = ({ expenses, onAdd, onEdit, onDelete }: ExpenseListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = 
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const commissionPayouts = filteredExpenses.filter(e => e.is_commission_payout);
  const totalCommissions = commissionPayouts.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Commission Payout': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Salaries': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Marketing': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Utilities': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Rent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Expenses</span>
            </div>
            <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Commission Payouts</span>
            </div>
            <p className="text-lg font-bold text-purple-600 mt-1">{formatCurrency(totalCommissions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Other Expenses</span>
            </div>
            <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(totalExpenses - totalCommissions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Transactions</span>
            </div>
            <p className="text-lg font-bold text-foreground mt-1">{filteredExpenses.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Expenses</CardTitle>
            <Button onClick={onAdd} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-2 px-4">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || categoryFilter !== 'all' 
                    ? 'No expenses match your filters' 
                    : 'No expenses recorded yet'}
                </div>
              ) : (
                filteredExpenses.map((expense) => (
                  <div key={expense.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(expense.expense_date), 'dd MMM yyyy')}
                        </p>
                        <Badge variant="outline" className={`mt-1 text-xs ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </Badge>
                      </div>
                      <p className="font-semibold text-destructive text-sm">{formatCurrency(expense.amount)}</p>
                    </div>
                    {expense.recipient && (
                      <p className="text-xs text-muted-foreground">To: {expense.recipient}</p>
                    )}
                    <div className="flex justify-end gap-1 pt-2 border-t border-border/50">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(expense)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteExpense(expense)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(expense.expense_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {expense.reference_number || '-'}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={expense.description}>
                        {expense.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryColor(expense.category)}>
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{expense.recipient || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(expense)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteExpense(expense)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {searchTerm || categoryFilter !== 'all' 
                          ? 'No expenses match your filters' 
                          : 'No expenses recorded yet'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteExpense} onOpenChange={() => setDeleteExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
              <br /><br />
              <strong>{deleteExpense?.description}</strong> - {deleteExpense && formatCurrency(deleteExpense.amount)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteExpense) {
                  onDelete(deleteExpense.id);
                  setDeleteExpense(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
