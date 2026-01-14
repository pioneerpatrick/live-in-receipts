import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Client, Payment } from '@/types/client';
import { Expense } from '@/types/expense';
import { CancelledSale } from '@/types/cancelledSale';
import { formatCurrency } from '@/lib/supabaseStorage';
import { getExpenses } from '@/lib/expenseStorage';
import { getCancelledSales } from '@/lib/cancelledSalesStorage';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  MinusCircle,
  PlusCircle,
  FileText,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Receipt,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { format } from 'date-fns';

interface ProfitLossStatementProps {
  clients: Client[];
  payments: Payment[];
  timeRange: string;
}

interface PLLineItem {
  label: string;
  amount: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
  note?: string;
}

export const ProfitLossStatement = ({ clients, payments, timeRange }: ProfitLossStatementProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cancelledSales, setCancelledSales] = useState<CancelledSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expensesData, cancelledData] = await Promise.all([
          getExpenses(),
          getCancelledSales(),
        ]);
        setExpenses(expensesData);
        setCancelledSales(cancelledData);
      } catch (error) {
        console.error('Error fetching P&L data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter by time range
  const filterByTimeRange = (date: string) => {
    const itemDate = new Date(date);
    const now = new Date();
    switch (timeRange) {
      case '7d':
        return (now.getTime() - itemDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return (now.getTime() - itemDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      case '90d':
        return (now.getTime() - itemDate.getTime()) <= 90 * 24 * 60 * 60 * 1000;
      case '1y':
        return (now.getTime() - itemDate.getTime()) <= 365 * 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  };

  const filteredPayments = useMemo(() => 
    payments.filter(p => filterByTimeRange(p.payment_date)), 
    [payments, timeRange]
  );

  const filteredExpenses = useMemo(() => 
    expenses.filter(e => filterByTimeRange(e.expense_date)), 
    [expenses, timeRange]
  );

  const filteredCancelledSales = useMemo(() => 
    cancelledSales.filter(c => filterByTimeRange(c.cancellation_date)), 
    [cancelledSales, timeRange]
  );

  // Calculate P&L components
  const plData = useMemo(() => {
    // REVENUE
    const grossSalesValue = clients.filter(c => c.status !== 'cancelled')
      .reduce((sum, c) => sum + c.total_price, 0);
    const totalDiscounts = clients.filter(c => c.status !== 'cancelled')
      .reduce((sum, c) => sum + c.discount, 0);
    const netSalesValue = grossSalesValue - totalDiscounts;
    
    // CASH RECEIVED (actual income)
    const cashFromSales = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    
    // CANCELLED SALES INCOME
    const cancellationFees = filteredCancelledSales.reduce((sum, c) => sum + c.cancellation_fee, 0);
    const forfeitedAmounts = filteredCancelledSales.reduce((sum, c) => {
      const retained = c.total_paid - c.net_refund - c.cancellation_fee;
      return sum + Math.max(0, retained);
    }, 0);
    const totalRetainedFromCancellations = cancellationFees + forfeitedAmounts;
    
    // TOTAL INCOME
    const totalIncome = cashFromSales + totalRetainedFromCancellations;

    // EXPENSES BY CATEGORY
    const expensesByCategory: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      if (!expensesByCategory[e.category]) {
        expensesByCategory[e.category] = 0;
      }
      expensesByCategory[e.category] += e.amount;
    });

    // Separate refunds from other expenses
    const refundExpenses = expensesByCategory['Refund'] || 0;
    delete expensesByCategory['Refund'];
    
    const operatingExpenses = Object.values(expensesByCategory).reduce((sum, v) => sum + v, 0);
    const totalExpenses = operatingExpenses + refundExpenses;

    // NET PROFIT/LOSS
    const grossProfit = totalIncome - refundExpenses; // Income after refunds
    const netProfit = grossProfit - operatingExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    // BALANCE SHEET ITEMS
    const totalReceivables = clients.filter(c => c.status !== 'cancelled')
      .reduce((sum, c) => sum + c.balance, 0);
    const pendingRefunds = filteredCancelledSales
      .filter(c => c.refund_status === 'pending')
      .reduce((sum, c) => sum + c.net_refund, 0);

    return {
      // Revenue section
      grossSalesValue,
      totalDiscounts,
      netSalesValue,
      
      // Income section
      cashFromSales,
      cancellationFees,
      forfeitedAmounts,
      totalRetainedFromCancellations,
      totalIncome,
      
      // Expense section
      refundExpenses,
      expensesByCategory,
      operatingExpenses,
      totalExpenses,
      
      // Profit section
      grossProfit,
      netProfit,
      profitMargin,
      
      // Balance items
      totalReceivables,
      pendingRefunds,
    };
  }, [clients, filteredPayments, filteredExpenses, filteredCancelledSales]);

  // Monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    const months: Record<string, { income: number; expenses: number; net: number }> = {};
    
    filteredPayments.forEach(p => {
      const monthKey = format(new Date(p.payment_date), 'MMM yyyy');
      if (!months[monthKey]) months[monthKey] = { income: 0, expenses: 0, net: 0 };
      months[monthKey].income += p.amount;
    });
    
    filteredExpenses.forEach(e => {
      const monthKey = format(new Date(e.expense_date), 'MMM yyyy');
      if (!months[monthKey]) months[monthKey] = { income: 0, expenses: 0, net: 0 };
      months[monthKey].expenses += e.amount;
    });
    
    Object.keys(months).forEach(k => {
      months[k].net = months[k].income - months[k].expenses;
    });
    
    return Object.entries(months)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .slice(0, 12);
  }, [filteredPayments, filteredExpenses]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading Profit & Loss data...
        </CardContent>
      </Card>
    );
  }

  const timeRangeLabel = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last 12 Months',
    'all': 'All Time',
  }[timeRange] || 'Selected Period';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Profit & Loss Statement
            </CardTitle>
            <Badge variant="outline">{timeRangeLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-card rounded-lg border">
              <ArrowUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-green-600">{formatCurrency(plData.totalIncome)}</p>
              <p className="text-xs text-muted-foreground">Total Income</p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg border">
              <ArrowDown className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-red-600">{formatCurrency(plData.totalExpenses)}</p>
              <p className="text-xs text-muted-foreground">Total Expenses</p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg border">
              <Calculator className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className={`text-xl font-bold ${plData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(plData.netProfit)}
              </p>
              <p className="text-xs text-muted-foreground">Net Profit/Loss</p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg border">
              <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className={`text-xl font-bold ${plData.profitMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {plData.profitMargin.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Profit Margin</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Detailed P&L Statement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Income Statement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Revenue Section */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Revenue</h4>
              <div className="pl-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Gross Sales Value</span>
                  <span>{formatCurrency(plData.grossSalesValue)}</span>
                </div>
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Less: Discounts</span>
                  <span>({formatCurrency(plData.totalDiscounts)})</span>
                </div>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Net Sales Value</span>
                <span>{formatCurrency(plData.netSalesValue)}</span>
              </div>
            </div>

            <Separator />

            {/* Cash Income Section */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Cash Income</h4>
              <div className="pl-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Payments Received</span>
                  <span className="text-green-600">{formatCurrency(plData.cashFromSales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cancellation Fees</span>
                  <span className="text-green-600">{formatCurrency(plData.cancellationFees)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Forfeited Deposits</span>
                  <span className="text-green-600">{formatCurrency(plData.forfeitedAmounts)}</span>
                </div>
              </div>
              <div className="flex justify-between font-bold text-green-600 border-t pt-1">
                <span>Total Cash Income</span>
                <span>{formatCurrency(plData.totalIncome)}</span>
              </div>
            </div>

            <Separator />

            {/* Expenses Section */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Expenses</h4>
              <div className="pl-4 space-y-1">
                {plData.refundExpenses > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Refunds Paid</span>
                    <span>({formatCurrency(plData.refundExpenses)})</span>
                  </div>
                )}
                {Object.entries(plData.expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span>{category}</span>
                      <span className="text-red-600">({formatCurrency(amount)})</span>
                    </div>
                  ))
                }
              </div>
              <div className="flex justify-between font-bold text-red-600 border-t pt-1">
                <span>Total Expenses</span>
                <span>({formatCurrency(plData.totalExpenses)})</span>
              </div>
            </div>

            <Separator className="border-2" />

            {/* Net Profit */}
            <div className={`p-3 rounded-lg ${plData.netProfit >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">NET PROFIT / (LOSS)</span>
                <span className={`font-bold text-xl ${plData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {plData.netProfit >= 0 ? '' : '('}{formatCurrency(Math.abs(plData.netProfit))}{plData.netProfit < 0 ? ')' : ''}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance & Monthly Breakdown */}
        <div className="space-y-6">
          {/* Balance Sheet Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-500" />
                Balance Sheet Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">Accounts Receivable</span>
                </div>
                <span className="font-bold text-amber-600">{formatCurrency(plData.totalReceivables)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <MinusCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-sm">Pending Refunds</span>
                </div>
                <span className="font-bold text-orange-600">{formatCurrency(plData.pendingRefunds)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Net Position</span>
                </div>
                <span className="font-bold text-green-600">
                  {formatCurrency(plData.totalReceivables - plData.pendingRefunds)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Monthly Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyBreakdown.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No data for selected period</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Income</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyBreakdown.map(([month, data]) => (
                        <TableRow key={month}>
                          <TableCell className="font-medium">{month}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(data.income)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(data.expenses)}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(data.net)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expense Categories Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            Expense Categories Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {plData.refundExpenses > 0 && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg text-center border border-orange-200">
                <p className="text-lg font-bold text-orange-600">{formatCurrency(plData.refundExpenses)}</p>
                <p className="text-xs text-muted-foreground">Refunds</p>
              </div>
            )}
            {Object.entries(plData.expensesByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => (
                <div key={category} className="p-3 bg-muted/50 rounded-lg text-center border">
                  <p className="text-lg font-bold">{formatCurrency(amount)}</p>
                  <p className="text-xs text-muted-foreground truncate">{category}</p>
                </div>
              ))
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
