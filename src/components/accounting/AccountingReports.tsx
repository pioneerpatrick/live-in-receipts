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
import { Client, Payment } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { TrendingUp, TrendingDown, MinusCircle, Users, Building2, UserCheck } from 'lucide-react';

interface AccountingReportsProps {
  clients: Client[];
  payments: Payment[];
  metrics: {
    totalRevenue: number;
    totalSalesValue: number;
    totalCollected: number;
    outstandingBalance: number;
    totalDiscount: number;
    avgPayment: number;
    completedClients: number;
    ongoingClients: number;
    collectionRate: number;
    thisMonth: number;
    lastMonth: number;
    monthlyGrowth: number;
    paymentCount: number;
  };
}

export const AccountingReports = ({ clients, payments, metrics }: AccountingReportsProps) => {
  // Client balances report
  const clientBalances = useMemo(() => {
    return clients
      .filter(c => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 20);
  }, [clients]);

  // Project-wise revenue
  const projectRevenue = useMemo(() => {
    const projectData: { [key: string]: { 
      salesValue: number; 
      collected: number; 
      balance: number; 
      discount: number;
      clients: number;
    }} = {};
    
    clients.forEach(client => {
      if (!projectData[client.project_name]) {
        projectData[client.project_name] = { 
          salesValue: 0, 
          collected: 0, 
          balance: 0, 
          discount: 0,
          clients: 0 
        };
      }
      projectData[client.project_name].salesValue += client.total_price;
      projectData[client.project_name].collected += client.total_paid;
      projectData[client.project_name].balance += client.balance;
      projectData[client.project_name].discount += client.discount;
      projectData[client.project_name].clients += 1;
    });

    return Object.entries(projectData)
      .sort(([, a], [, b]) => b.collected - a.collected)
      .map(([project, data]) => ({
        project,
        ...data,
      }));
  }, [clients]);

  // Profit & Loss calculation
  const profitLoss = useMemo(() => {
    const grossRevenue = metrics.totalSalesValue;
    const discounts = metrics.totalDiscount;
    const netRevenue = grossRevenue - discounts;
    const collected = metrics.totalCollected;
    const outstanding = metrics.outstandingBalance;
    
    return {
      grossRevenue,
      discounts,
      netRevenue,
      collected,
      outstanding,
      realizationRate: netRevenue > 0 ? (collected / netRevenue) * 100 : 0,
    };
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* Profit & Loss Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Profit & Loss Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Gross Revenue</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(profitLoss.grossRevenue)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Discounts</p>
              <p className="text-lg font-bold text-orange-600">-{formatCurrency(profitLoss.discounts)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Net Revenue</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(profitLoss.netRevenue)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(profitLoss.collected)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(profitLoss.outstanding)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Realization Rate</p>
              <p className={`text-lg font-bold ${profitLoss.realizationRate >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
                {profitLoss.realizationRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue vs Discounts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MinusCircle className="w-5 h-5 text-orange-500" />
            Revenue vs Discounts Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Gross Sales</p>
                <p className="text-xl font-bold">{formatCurrency(metrics.totalSalesValue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary opacity-50" />
            </div>
            <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Discounts</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(metrics.totalDiscount)}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.totalSalesValue > 0 ? ((metrics.totalDiscount / metrics.totalSalesValue) * 100).toFixed(1) : 0}% of gross
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
            <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Net After Discount</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(metrics.totalSalesValue - metrics.totalDiscount)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Balances Report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Client Balances (Top 20)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientBalances.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{client.project_name}</TableCell>
                      <TableCell className="text-right text-amber-600 font-semibold">
                        {formatCurrency(client.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {clientBalances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No outstanding balances
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Project-wise Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Project-wise Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Clients</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectRevenue.map((project) => (
                    <TableRow key={project.project}>
                      <TableCell className="font-medium">{project.project}</TableCell>
                      <TableCell className="text-right text-primary font-semibold">
                        {formatCurrency(project.collected)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        {formatCurrency(project.balance)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {project.clients}
                      </TableCell>
                    </TableRow>
                  ))}
                  {projectRevenue.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No project data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-500" />
            Client Status Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{metrics.completedClients}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-4 bg-amber-500/10 rounded-lg">
              <p className="text-3xl font-bold text-amber-600">{metrics.ongoingClients}</p>
              <p className="text-sm text-muted-foreground">Ongoing</p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-3xl font-bold text-primary">{clients.length}</p>
              <p className="text-sm text-muted-foreground">Total Clients</p>
            </div>
            <div className="text-center p-4 bg-secondary/10 rounded-lg">
              <p className="text-3xl font-bold text-secondary">
                {clients.length > 0 ? ((metrics.completedClients / clients.length) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
