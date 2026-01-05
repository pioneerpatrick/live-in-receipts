import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  LineChart, Line, PieChart, Pie, Cell, 
  AreaChart, Area, ResponsiveContainer 
} from 'recharts';
import { Client, Payment } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';

interface RevenueChartsProps {
  clients: Client[];
  payments: Payment[];
}

export const RevenueCharts = ({ clients, payments }: RevenueChartsProps) => {
  const COLORS = [
    'hsl(var(--primary))', 
    'hsl(var(--secondary))', 
    '#10b981', 
    '#f59e0b', 
    '#8b5cf6', 
    '#ec4899',
    '#06b6d4',
    '#84cc16'
  ];

  const chartConfig = {
    amount: { label: 'Amount', color: 'hsl(var(--primary))' },
    revenue: { label: 'Revenue', color: 'hsl(var(--secondary))' },
    collected: { label: 'Collected', color: 'hsl(var(--primary))' },
    balance: { label: 'Balance', color: '#f59e0b' },
  };

  // Payment trends by month
  const paymentTrends = useMemo(() => {
    const monthlyData: { [key: string]: { collected: number; count: number } } = {};
    payments.forEach(payment => {
      const date = new Date(payment.payment_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { collected: 0, count: 0 };
      }
      monthlyData[monthKey].collected += payment.amount;
      monthlyData[monthKey].count += 1;
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        collected: data.collected,
        count: data.count,
      }));
  }, [payments]);

  // Revenue by project
  const revenueByProject = useMemo(() => {
    const projectData: { [key: string]: { collected: number; balance: number; clients: number } } = {};
    clients.forEach(client => {
      if (!projectData[client.project_name]) {
        projectData[client.project_name] = { collected: 0, balance: 0, clients: 0 };
      }
      projectData[client.project_name].collected += client.total_paid;
      projectData[client.project_name].balance += client.balance;
      projectData[client.project_name].clients += 1;
    });

    return Object.entries(projectData)
      .sort(([, a], [, b]) => b.collected - a.collected)
      .map(([project, data]) => ({
        project,
        ...data,
      }));
  }, [clients]);

  // Agent performance
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
      .map(([agent, data]) => ({
        agent: agent.length > 12 ? agent.substring(0, 12) + '...' : agent,
        fullName: agent,
        ...data,
        rate: data.sales > 0 ? (data.collected / data.sales) * 100 : 0,
      }));
  }, [clients]);

  // Payment method distribution
  const paymentMethods = useMemo(() => {
    const methodData: { [key: string]: number } = {};
    payments.forEach(payment => {
      methodData[payment.payment_method] = (methodData[payment.payment_method] || 0) + payment.amount;
    });

    return Object.entries(methodData).map(([method, amount]) => ({
      method,
      amount,
    }));
  }, [payments]);

  // Outstanding balances by project
  const outstandingByProject = useMemo(() => {
    return revenueByProject
      .filter(p => p.balance > 0)
      .map(p => ({
        project: p.project,
        balance: p.balance,
      }));
  }, [revenueByProject]);

  return (
    <div className="space-y-6">
      {/* Top Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Installments Collected Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Installments Collected (Trend)</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentTrends.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px]">
                <AreaChart data={paymentTrends}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Area 
                    type="monotone" 
                    dataKey="collected" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorCollected)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No payment data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Project */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Project</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByProject.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px]">
                <BarChart data={revenueByProject} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} className="text-xs" />
                  <YAxis type="category" dataKey="project" width={100} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Bar dataKey="collected" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Collected" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No project data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outstanding Balances */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outstanding Balances by Project</CardTitle>
          </CardHeader>
          <CardContent>
            {outstandingByProject.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px]">
                <BarChart data={outstandingByProject}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="project" className="text-xs" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Bar dataKey="balance" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Balance" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-center">
                No outstanding balances
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {agentPerformance.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px]">
                <BarChart data={agentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="agent" className="text-xs" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} className="text-xs" />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value, name) => [formatCurrency(Number(value)), name === 'collected' ? 'Collected' : 'Sales']} 
                    />} 
                  />
                  <Bar dataKey="collected" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Collected" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No agent data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Methods Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethods.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px]">
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    dataKey="amount"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ method, percent }) => `${method} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {paymentMethods.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No payment method data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Rankings Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[280px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold">#</th>
                    <th className="text-left py-2 px-2 font-semibold">Agent</th>
                    <th className="text-right py-2 px-2 font-semibold">Collected</th>
                    <th className="text-right py-2 px-2 font-semibold">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.slice(0, 10).map((agent, index) => (
                    <tr key={agent.fullName} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-2">{index + 1}</td>
                      <td className="py-2 px-2 font-medium" title={agent.fullName}>{agent.agent}</td>
                      <td className="py-2 px-2 text-right text-primary font-medium">{formatCurrency(agent.collected)}</td>
                      <td className="py-2 px-2 text-right">
                        <span className={agent.rate >= 50 ? 'text-green-600' : 'text-amber-600'}>
                          {agent.rate.toFixed(0)}%
                        </span>
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
