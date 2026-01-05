import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Client } from '@/types/client';
import { Expense } from '@/types/expense';
import { formatCurrency } from '@/lib/supabaseStorage';
import { Users, TrendingUp, Wallet, AlertCircle } from 'lucide-react';

interface CommissionReportProps {
  clients: Client[];
  expenses: Expense[];
}

export const CommissionReport = ({ clients, expenses }: CommissionReportProps) => {
  const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const chartConfig = {
    earned: { label: 'Earned', color: 'hsl(var(--primary))' },
    paid: { label: 'Paid', color: '#10b981' },
    pending: { label: 'Pending', color: '#f59e0b' },
  };

  // Calculate agent commission data
  const agentCommissionData = useMemo(() => {
    const agentData: { [key: string]: { 
      earned: number; 
      paid: number; 
      clients: number;
      sales: number;
    }} = {};

    // Calculate earned commissions from clients
    clients.forEach(client => {
      const agent = client.sales_agent || 'Unknown';
      if (!agentData[agent]) {
        agentData[agent] = { earned: 0, paid: 0, clients: 0, sales: 0 };
      }
      agentData[agent].earned += client.commission || 0;
      agentData[agent].clients += 1;
      agentData[agent].sales += client.total_price;
    });

    // Calculate paid commissions from expenses
    const commissionPayouts = expenses.filter(e => e.is_commission_payout);
    commissionPayouts.forEach(payout => {
      const agent = payout.agent_id || 'Unknown';
      if (!agentData[agent]) {
        agentData[agent] = { earned: 0, paid: 0, clients: 0, sales: 0 };
      }
      agentData[agent].paid += payout.amount;
    });

    return Object.entries(agentData)
      .filter(([, data]) => data.earned > 0 || data.paid > 0)
      .sort(([, a], [, b]) => b.earned - a.earned)
      .map(([agent, data]) => ({
        agent: agent.length > 15 ? agent.substring(0, 15) + '...' : agent,
        fullName: agent,
        ...data,
        pending: Math.max(0, data.earned - data.paid),
      }));
  }, [clients, expenses]);

  // Summary metrics
  const metrics = useMemo(() => {
    const totalEarned = agentCommissionData.reduce((sum, a) => sum + a.earned, 0);
    const totalPaid = agentCommissionData.reduce((sum, a) => sum + a.paid, 0);
    const totalPending = agentCommissionData.reduce((sum, a) => sum + a.pending, 0);
    
    return { totalEarned, totalPaid, totalPending };
  }, [agentCommissionData]);

  // Pie chart data
  const pieData = useMemo(() => {
    return [
      { name: 'Paid', value: metrics.totalPaid },
      { name: 'Pending', value: metrics.totalPending },
    ].filter(d => d.value > 0);
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.totalEarned)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid Out</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalPaid)}</p>
              </div>
              <Wallet className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Payouts</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(metrics.totalPending)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Agents</p>
                <p className="text-2xl font-bold text-purple-600">{agentCommissionData.length}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission by Agent */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commission by Agent</CardTitle>
          </CardHeader>
          <CardContent>
            {agentCommissionData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={agentCommissionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="agent" className="text-xs" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Bar dataKey="earned" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Earned" />
                  <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} name="Paid" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No commission data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payout Status</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No payout data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Agent Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Agent Commission Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Clients</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Commission Earned</TableHead>
                  <TableHead className="text-right">Commission Paid</TableHead>
                  <TableHead className="text-right">Pending Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentCommissionData.map((agent) => (
                  <TableRow key={agent.fullName}>
                    <TableCell className="font-medium" title={agent.fullName}>{agent.agent}</TableCell>
                    <TableCell className="text-right">{agent.clients}</TableCell>
                    <TableCell className="text-right">{formatCurrency(agent.sales)}</TableCell>
                    <TableCell className="text-right text-primary font-medium">
                      {formatCurrency(agent.earned)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(agent.paid)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={agent.pending > 0 ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}>
                        {formatCurrency(agent.pending)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {agentCommissionData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No commission data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
