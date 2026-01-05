import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Client, Payment } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { TrendingUp, Calendar, Building2, Users2 } from 'lucide-react';

interface AnalyticsDashboardProps {
  clients: Client[];
  payments: Payment[];
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
}

export const AnalyticsDashboard = ({ clients, payments, timeRange, onTimeRangeChange }: AnalyticsDashboardProps) => {
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

  const paymentTrends = useMemo(() => {
    const monthlyData: { [key: string]: number } = {};
    filteredPayments.forEach(payment => {
      const date = new Date(payment.payment_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + payment.amount;
    });
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        amount
      }));
  }, [filteredPayments]);

  const revenueByProject = useMemo(() => {
    const projectData: { [key: string]: number } = {};
    clients.forEach(client => {
      projectData[client.project_name] = (projectData[client.project_name] || 0) + client.total_paid;
    });
    return Object.entries(projectData)
      .sort(([, a], [, b]) => b - a)
      .map(([project, revenue]) => ({ project, revenue }));
  }, [clients]);

  const agentPerformance = useMemo(() => {
    const agentData: { [key: string]: { sales: number; collected: number; clients: number } } = {};
    clients.forEach(client => {
      const agent = client.sales_agent || 'Unknown';
      if (!agentData[agent]) {
        agentData[agent] = { sales: 0, collected: 0, clients: 0 };
      }
      agentData[agent].sales += client.total_price;
      agentData[agent].collected += client.total_paid;
      agentData[agent].clients += 1;
    });
    return Object.entries(agentData)
      .sort(([, a], [, b]) => b.collected - a.collected)
      .map(([agent, data]) => ({ agent, ...data }));
  }, [clients]);

  const paymentMethods = useMemo(() => {
    const methodData: { [key: string]: number } = {};
    filteredPayments.forEach(payment => {
      methodData[payment.payment_method] = (methodData[payment.payment_method] || 0) + payment.amount;
    });
    return Object.entries(methodData).map(([method, amount]) => ({ method, amount }));
  }, [filteredPayments]);

  const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const avgPayment = filteredPayments.length > 0 ? totalRevenue / filteredPayments.length : 0;

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#f59e0b', '#10b981', '#8b5cf6'];

  const chartConfig = {
    amount: { label: 'Amount', color: 'hsl(var(--primary))' },
    revenue: { label: 'Revenue', color: 'hsl(var(--secondary))' },
    collected: { label: 'Collected', color: 'hsl(var(--primary))' },
    sales: { label: 'Sales', color: 'hsl(var(--secondary))' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground">Track payment trends, revenue, and agent performance</p>
        </div>
        <Select value={timeRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="w-40">
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">{filteredPayments.length} payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Payment</CardTitle>
            <Calendar className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-secondary">{formatCurrency(avgPayment)}</p>
            <p className="text-xs text-muted-foreground">per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
            <Building2 className="h-4 w-4 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{revenueByProject.length}</p>
            <p className="text-xs text-muted-foreground">with revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Agents</CardTitle>
            <Users2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{agentPerformance.length}</p>
            <p className="text-xs text-muted-foreground">with sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentTrends.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <LineChart data={paymentTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No payment data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {agentPerformance.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={agentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="agent" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Bar dataKey="collected" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Collected" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No agent data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethods.length > 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ method, percent }) => `${method} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {paymentMethods.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  </PieChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No payment method data
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold">#</th>
                    <th className="text-left py-2 px-2 font-semibold">Agent</th>
                    <th className="text-right py-2 px-2 font-semibold">Clients</th>
                    <th className="text-right py-2 px-2 font-semibold">Collected</th>
                    <th className="text-right py-2 px-2 font-semibold">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((agent, index) => (
                    <tr key={agent.agent} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-2">{index + 1}</td>
                      <td className="py-2 px-2 font-medium">{agent.agent}</td>
                      <td className="py-2 px-2 text-right">{agent.clients}</td>
                      <td className="py-2 px-2 text-right text-primary font-medium">{formatCurrency(agent.collected)}</td>
                      <td className="py-2 px-2 text-right">
                        {agent.sales > 0 ? ((agent.collected / agent.sales) * 100).toFixed(0) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
