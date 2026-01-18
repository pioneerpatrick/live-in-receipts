import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Play, Eye, Users, FileText, LayoutDashboard, 
  TrendingUp, Calendar, CheckCircle, Clock
} from 'lucide-react';

// Demo data for pitching to new clients
const DEMO_CLIENTS = [
  {
    id: '1',
    name: 'John Kamau',
    phone: '+254 712 345 678',
    project_name: 'Sunset Gardens',
    plot_number: 'A-15',
    total_price: 850000,
    total_paid: 425000,
    balance: 425000,
    status: 'ongoing',
    percent_paid: 50,
    next_payment_date: '2024-02-15',
  },
  {
    id: '2',
    name: 'Mary Wanjiku',
    phone: '+254 723 456 789',
    project_name: 'Green Valley Estate',
    plot_number: 'B-23',
    total_price: 1200000,
    total_paid: 1200000,
    balance: 0,
    status: 'completed',
    percent_paid: 100,
    next_payment_date: null,
  },
  {
    id: '3',
    name: 'Peter Ochieng',
    phone: '+254 734 567 890',
    project_name: 'Sunset Gardens',
    plot_number: 'A-22, A-23',
    total_price: 1700000,
    total_paid: 680000,
    balance: 1020000,
    status: 'ongoing',
    percent_paid: 40,
    next_payment_date: '2024-02-01',
  },
  {
    id: '4',
    name: 'Grace Njeri',
    phone: '+254 745 678 901',
    project_name: 'Hilltop Heights',
    plot_number: 'C-08',
    total_price: 650000,
    total_paid: 162500,
    balance: 487500,
    status: 'ongoing',
    percent_paid: 25,
    next_payment_date: '2024-02-20',
  },
  {
    id: '5',
    name: 'David Mwangi',
    phone: '+254 756 789 012',
    project_name: 'Green Valley Estate',
    plot_number: 'B-10',
    total_price: 1200000,
    total_paid: 900000,
    balance: 300000,
    status: 'ongoing',
    percent_paid: 75,
    next_payment_date: '2024-01-30',
  },
];

const DEMO_PAYMENTS = [
  { date: '2024-01-15', client: 'John Kamau', amount: 85000, method: 'M-Pesa', receipt: 'RCP-2024-0125' },
  { date: '2024-01-14', client: 'David Mwangi', amount: 150000, method: 'Bank Transfer', receipt: 'RCP-2024-0124' },
  { date: '2024-01-13', client: 'Peter Ochieng', amount: 170000, method: 'Cash', receipt: 'RCP-2024-0123' },
  { date: '2024-01-12', client: 'Grace Njeri', amount: 65000, method: 'M-Pesa', receipt: 'RCP-2024-0122' },
  { date: '2024-01-11', client: 'Mary Wanjiku', amount: 200000, method: 'Bank Transfer', receipt: 'RCP-2024-0121' },
];

export const DemoModeSection = () => {
  const [activeView, setActiveView] = useState<'overview' | 'clients' | 'payments'>('overview');

  const totalClients = DEMO_CLIENTS.length;
  const totalRevenue = DEMO_CLIENTS.reduce((sum, c) => sum + c.total_paid, 0);
  const totalReceivables = DEMO_CLIENTS.reduce((sum, c) => sum + c.balance, 0);
  const completedClients = DEMO_CLIENTS.filter(c => c.status === 'completed').length;

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
          </div>
        </div>
        <CardDescription>
          Show this demo data when pitching to potential clients. This is sample data only.
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
                {DEMO_CLIENTS.map((client) => (
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
                {DEMO_PAYMENTS.map((payment, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {payment.date}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{payment.client}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      KES {payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.method}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {payment.receipt}
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
