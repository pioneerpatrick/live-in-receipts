import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Client, Payment } from '@/types/client';
import { getClients, getPayments, formatCurrency } from '@/lib/supabaseStorage';
import { TrendingUp, Building2, Users2, Calendar } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Dashboard = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsData, paymentsData] = await Promise.all([
        getClients(),
        getPayments()
      ]);
      setClients(clientsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter payments by time range
  const filterByTimeRange = (data: Payment[]) => {
    const now = new Date();
    return data.filter(p => {
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
  };

  const filteredPayments = filterByTimeRange(payments);

  // Payment trends by month
  const getPaymentTrends = () => {
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
  };

  // Revenue by project
  const getRevenueByProject = () => {
    const projectData: { [key: string]: number } = {};
    clients.forEach(client => {
      projectData[client.project_name] = (projectData[client.project_name] || 0) + client.total_paid;
    });

    return Object.entries(projectData)
      .sort(([, a], [, b]) => b - a)
      .map(([project, revenue]) => ({
        project,
        revenue
      }));
  };

  // Agent performance
  const getAgentPerformance = () => {
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
      .map(([agent, data]) => ({
        agent,
        ...data
      }));
  };

  // Payment method distribution
  const getPaymentMethodDistribution = () => {
    const methodData: { [key: string]: number } = {};
    filteredPayments.forEach(payment => {
      methodData[payment.payment_method] = (methodData[payment.payment_method] || 0) + payment.amount;
    });

    return Object.entries(methodData).map(([method, amount]) => ({
      method,
      amount
    }));
  };

  const paymentTrends = getPaymentTrends();
  const revenueByProject = getRevenueByProject();
  const agentPerformance = getAgentPerformance();
  const paymentMethods = getPaymentMethodDistribution();

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#f59e0b', '#10b981', '#8b5cf6'];

  const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const avgPayment = filteredPayments.length > 0 ? totalRevenue / filteredPayments.length : 0;

  const chartConfig = {
    amount: { label: 'Amount', color: 'hsl(var(--primary))' },
    revenue: { label: 'Revenue', color: 'hsl(var(--secondary))' },
    collected: { label: 'Collected', color: 'hsl(var(--primary))' },
    sales: { label: 'Sales', color: 'hsl(var(--secondary))' },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Track payment trends, revenue, and agent performance</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Payment Trends */}
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

          {/* Revenue by Project */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Project</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueByProject.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={revenueByProject} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="project" width={100} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                    <Bar dataKey="revenue" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No project data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Performance */}
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

          {/* Payment Methods */}
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
        </div>

        {/* Agent Rankings Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Agent Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Rank</th>
                    <th className="text-left py-3 px-4 font-semibold">Agent</th>
                    <th className="text-right py-3 px-4 font-semibold">Clients</th>
                    <th className="text-right py-3 px-4 font-semibold">Total Sales</th>
                    <th className="text-right py-3 px-4 font-semibold">Collected</th>
                    <th className="text-right py-3 px-4 font-semibold">Collection Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((agent, index) => (
                    <tr key={agent.agent} className="border-b hover:bg-muted/30">
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4 font-medium">{agent.agent}</td>
                      <td className="py-3 px-4 text-right">{agent.clients}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(agent.sales)}</td>
                      <td className="py-3 px-4 text-right text-primary font-medium">{formatCurrency(agent.collected)}</td>
                      <td className="py-3 px-4 text-right">
                        {agent.sales > 0 ? ((agent.collected / agent.sales) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
