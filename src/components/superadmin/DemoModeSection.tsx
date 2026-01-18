import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play, Eye, Users, FileText, LayoutDashboard, 
  TrendingUp, Calendar, CheckCircle, Clock, ExternalLink, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface DemoClient {
  id: string;
  name: string;
  phone: string;
  project_name: string;
  plot_number: string;
  total_price: number;
  total_paid: number;
  balance: number;
  status: string;
  percent_paid: number;
  next_payment_date: string | null;
}

interface DemoPayment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  receipt_number: string;
  client_name?: string;
}

export const DemoModeSection = () => {
  const [activeView, setActiveView] = useState<'overview' | 'clients' | 'payments'>('overview');
  const [loading, setLoading] = useState(true);
  const [demoTenantId, setDemoTenantId] = useState<string | null>(null);
  const [clients, setClients] = useState<DemoClient[]>([]);
  const [payments, setPayments] = useState<DemoPayment[]>([]);

  useEffect(() => {
    fetchDemoData();
  }, []);

  const fetchDemoData = async () => {
    setLoading(true);
    try {
      // Get demo tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'demo-company')
        .maybeSingle();

      if (tenantError) throw tenantError;
      if (!tenant) {
        setLoading(false);
        return;
      }

      setDemoTenantId(tenant.id);

      // Fetch clients and payments for demo tenant
      const [clientsResult, paymentsResult] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, phone, project_name, plot_number, total_price, total_paid, balance, status, percent_paid, next_payment_date')
          .eq('tenant_id', tenant.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('id, payment_date, amount, payment_method, receipt_number, client_id')
          .eq('tenant_id', tenant.id)
          .order('payment_date', { ascending: false })
          .limit(10),
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      setClients(clientsResult.data || []);
      
      // Map payments with client names
      const paymentsWithNames = (paymentsResult.data || []).map(payment => {
        const client = clientsResult.data?.find(c => c.id === payment.client_id);
        return {
          ...payment,
          client_name: client?.name || 'Unknown',
        };
      });
      setPayments(paymentsWithNames);

    } catch (error) {
      console.error('Error fetching demo data:', error);
      toast.error('Failed to load demo data');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessDemo = () => {
    if (!demoTenantId) {
      toast.error('Demo tenant not found');
      return;
    }
    const accessUrl = `${window.location.origin}?tenant=demo.example.com&super_access=true`;
    window.open(accessUrl, '_blank');
    toast.success('Opening demo tenant in new tab');
  };

  const totalClients = clients.length;
  const totalRevenue = clients.reduce((sum, c) => sum + c.total_paid, 0);
  const totalReceivables = clients.reduce((sum, c) => sum + c.balance, 0);
  const completedClients = clients.filter(c => c.status === 'completed').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'ongoing':
        return <Badge className="bg-blue-500">Ongoing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
        <CardContent className="p-8 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mr-2" />
          <span>Loading demo data...</span>
        </CardContent>
      </Card>
    );
  }

  if (!demoTenantId) {
    return (
      <Card className="border-2 border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
        <CardContent className="p-8 text-center">
          <Play className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Demo Tenant Initializing</h3>
          <p className="text-muted-foreground">The demo tenant with sample data is being created. Please refresh in a moment.</p>
          <Button onClick={fetchDemoData} className="mt-4" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-amber-700 dark:text-amber-400">Demo Mode</CardTitle>
            <Badge variant="outline" className="border-amber-500 text-amber-600">For Presentations</Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={activeView === 'overview' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveView('overview')}
            >
              <LayoutDashboard className="w-4 h-4 mr-1" />
              Overview
            </Button>
            <Button 
              variant={activeView === 'clients' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveView('clients')}
            >
              <Users className="w-4 h-4 mr-1" />
              Clients
            </Button>
            <Button 
              variant={activeView === 'payments' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveView('payments')}
            >
              <FileText className="w-4 h-4 mr-1" />
              Payments
            </Button>
            <Button 
              size="sm"
              onClick={handleAccessDemo}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open Full Demo
            </Button>
          </div>
        </div>
        <CardDescription>
          Live demo data from the "Demo Properties Ltd" tenant. Use this when pitching to potential clients.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Demo Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white dark:bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Clients</p>
                      <p className="text-2xl font-bold">{totalClients}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Collected</p>
                      <p className="text-2xl font-bold text-green-600">
                        KES {totalRevenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-amber-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="text-2xl font-bold text-amber-600">
                        KES {totalReceivables.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold">{completedClients} / {totalClients}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Demo Feature Highlights */}
            <div className="bg-white dark:bg-card rounded-lg p-4 border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Key Features to Highlight
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Real-time payment tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Automatic receipt generation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Multi-project management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Payment reminder alerts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Custom branding per client
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Accounting & expense tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Payroll management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Secure multi-user access
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeView === 'clients' && (
          <div className="rounded-md border bg-white dark:bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Plot</TableHead>
                  <TableHead className="text-right">Total Price</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>{client.project_name}</TableCell>
                    <TableCell>{client.plot_number}</TableCell>
                    <TableCell className="text-right">KES {client.total_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-600">
                      KES {client.total_paid.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-amber-600">
                      KES {client.balance.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${client.percent_paid}%` }}
                          />
                        </div>
                        <span className="text-xs">{client.percent_paid}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(client.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeView === 'payments' && (
          <div className="rounded-md border bg-white dark:bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt #</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{payment.client_name}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      KES {payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.payment_method}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {payment.receipt_number}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
