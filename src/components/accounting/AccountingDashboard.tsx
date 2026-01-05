import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Client, Payment } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Users, 
  Building2,
  FileDown,
  FileSpreadsheet,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  BookOpen,
  Receipt
} from 'lucide-react';
import { RevenueCharts } from './RevenueCharts';
import { AccountingReports } from './AccountingReports';
import { GeneralLedger } from './GeneralLedger';
import { ExpensesDashboard } from '@/components/expenses/ExpensesDashboard';
import { exportAccountingToPDF, exportAccountingToExcel } from '@/lib/accountingExport';

interface AccountingDashboardProps {
  clients: Client[];
  payments: Payment[];
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
}

export const AccountingDashboard = ({ 
  clients, 
  payments, 
  timeRange, 
  onTimeRangeChange 
}: AccountingDashboardProps) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Filter payments by time range
  const filteredPayments = useMemo(() => {
    const now = new Date();
    return payments.filter(p => {
      const paymentDate = new Date(p.payment_date);
      switch (timeRange) {
        case '7d':
          return (now.getTime() - paymentDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
        case '30d':
          return (now.getTime() - paymentDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
        case '90d':
          return (now.getTime() - paymentDate.getTime()) <= 90 * 24 * 60 * 60 * 1000;
        case '1y':
          return (now.getTime() - paymentDate.getTime()) <= 365 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    });
  }, [payments, timeRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalSalesValue = clients.reduce((sum, c) => sum + c.total_price, 0);
    const totalCollected = clients.reduce((sum, c) => sum + c.total_paid, 0);
    const outstandingBalance = clients.reduce((sum, c) => sum + c.balance, 0);
    const totalDiscount = clients.reduce((sum, c) => sum + c.discount, 0);
    const avgPayment = filteredPayments.length > 0 ? totalRevenue / filteredPayments.length : 0;
    const completedClients = clients.filter(c => c.status === 'completed' || c.balance === 0).length;
    const ongoingClients = clients.filter(c => c.status === 'ongoing' && c.balance > 0).length;
    
    // Calculate collection rate
    const collectionRate = totalSalesValue > 0 ? (totalCollected / totalSalesValue) * 100 : 0;
    
    // Calculate monthly growth
    const now = new Date();
    const thisMonth = filteredPayments.filter(p => {
      const d = new Date(p.payment_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, p) => sum + p.amount, 0);
    
    const lastMonth = filteredPayments.filter(p => {
      const d = new Date(p.payment_date);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    }).reduce((sum, p) => sum + p.amount, 0);
    
    const monthlyGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    return {
      totalRevenue,
      totalSalesValue,
      totalCollected,
      outstandingBalance,
      totalDiscount,
      avgPayment,
      completedClients,
      ongoingClients,
      collectionRate,
      thisMonth,
      lastMonth,
      monthlyGrowth,
      paymentCount: filteredPayments.length,
    };
  }, [clients, filteredPayments]);

  const handleExportPDF = () => {
    exportAccountingToPDF(clients, payments, timeRange);
  };

  const handleExportExcel = () => {
    exportAccountingToExcel(clients, payments, timeRange);
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Range and Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Accounting Dashboard
          </h2>
          <p className="text-muted-foreground text-sm">Financial overview and reporting</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4 mr-1" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg sm:text-2xl font-bold text-primary">{formatCurrency(metrics.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">{metrics.paymentCount} payments</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Wallet className="w-4 h-4" />
              Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(metrics.totalCollected)}</p>
            <p className="text-xs text-muted-foreground">{metrics.collectionRate.toFixed(1)}% rate</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg sm:text-2xl font-bold text-amber-600">{formatCurrency(metrics.outstandingBalance)}</p>
            <p className="text-xs text-muted-foreground">{metrics.ongoingClients} ongoing</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              {metrics.monthlyGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              Monthly Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-lg sm:text-2xl font-bold ${metrics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.monthlyGrowth >= 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-lg p-3 border">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Sales Value</span>
          </div>
          <p className="text-sm font-semibold mt-1">{formatCurrency(metrics.totalSalesValue)}</p>
        </div>
        <div className="bg-card rounded-lg p-3 border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Clients</span>
          </div>
          <p className="text-sm font-semibold mt-1">{clients.length}</p>
        </div>
        <div className="bg-card rounded-lg p-3 border">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Total Discounts</span>
          </div>
          <p className="text-sm font-semibold mt-1 text-orange-600">{formatCurrency(metrics.totalDiscount)}</p>
        </div>
        <div className="bg-card rounded-lg p-3 border">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Avg Payment</span>
          </div>
          <p className="text-sm font-semibold mt-1">{formatCurrency(metrics.avgPayment)}</p>
        </div>
      </div>

      {/* Tabs for Different Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <LineChartIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Charts</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <PieChartIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-1">
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">Expenses</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Ledger</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <RevenueCharts 
            clients={clients} 
            payments={filteredPayments} 
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <AccountingReports 
            clients={clients} 
            payments={filteredPayments}
            metrics={metrics}
          />
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <ExpensesDashboard clients={clients} />
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <GeneralLedger 
            clients={clients} 
            payments={filteredPayments} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
