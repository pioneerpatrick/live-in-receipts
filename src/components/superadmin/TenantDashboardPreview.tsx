import { useState } from 'react';
import { Tenant } from '@/types/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Eye, Users, FileText, LayoutDashboard, TrendingUp, 
  X, Building2, Calendar, CreditCard, Settings, 
  PieChart, Clock, CheckCircle, AlertTriangle
} from 'lucide-react';

interface TenantDashboardPreviewProps {
  tenant: Tenant;
  open: boolean;
  onClose: () => void;
}

// Mock data for preview - doesn't access real tenant data
const mockStats = {
  totalClients: 24,
  totalCollected: 4850000,
  totalReceivables: 2150000,
  activeProjects: 3,
  completedClients: 8,
  overduePayments: 5,
};

const mockClients = [
  { id: '1', name: 'John Mwangi', phone: '0712345678', project: 'Sunrise Gardens', plot: 'A-15', balance: 150000, status: 'ongoing' },
  { id: '2', name: 'Mary Wanjiku', phone: '0723456789', project: 'Valley View', plot: 'B-22', balance: 0, status: 'completed' },
  { id: '3', name: 'Peter Ochieng', phone: '0734567890', project: 'Sunrise Gardens', plot: 'A-08', balance: 280000, status: 'ongoing' },
  { id: '4', name: 'Grace Akinyi', phone: '0745678901', project: 'Hillside Estate', plot: 'C-05', balance: 95000, status: 'ongoing' },
  { id: '5', name: 'David Kamau', phone: '0756789012', project: 'Valley View', plot: 'B-11', balance: 0, status: 'completed' },
];

const mockRecentPayments = [
  { id: '1', date: '2024-01-15', client: 'John Mwangi', amount: 50000, method: 'M-Pesa', receipt: 'RCP-2024-0089' },
  { id: '2', date: '2024-01-14', client: 'Peter Ochieng', amount: 75000, method: 'Bank Transfer', receipt: 'RCP-2024-0088' },
  { id: '3', date: '2024-01-12', client: 'Grace Akinyi', amount: 25000, method: 'M-Pesa', receipt: 'RCP-2024-0087' },
  { id: '4', date: '2024-01-10', client: 'Mary Wanjiku', amount: 100000, method: 'Cheque', receipt: 'RCP-2024-0086' },
];

const mockProjects = [
  { id: '1', name: 'Sunrise Gardens', location: 'Kitengela', totalPlots: 50, soldPlots: 35, availablePlots: 15 },
  { id: '2', name: 'Valley View', location: 'Nakuru', totalPlots: 40, soldPlots: 28, availablePlots: 12 },
  { id: '3', name: 'Hillside Estate', location: 'Naivasha', totalPlots: 30, soldPlots: 12, availablePlots: 18 },
];

export const TenantDashboardPreview = ({ tenant, open, onClose }: TenantDashboardPreviewProps) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'ongoing':
        return <Badge className="bg-blue-500">Ongoing</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        {/* Simulated Header */}
        <div 
          className="p-4 border-b"
          style={{ 
            background: `linear-gradient(135deg, ${tenant.primary_color}15, ${tenant.secondary_color}10)` 
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: tenant.primary_color }}
              >
                {tenant.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-bold text-lg">{tenant.name}</h2>
                <p className="text-xs text-muted-foreground">Dashboard Preview (Mock Data)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                <Eye className="w-3 h-3 mr-1" />
                Preview Mode
              </Badge>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['dashboard', 'clients', 'payments', 'projects', 'settings'].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab)}
                style={activeTab === tab ? { backgroundColor: tenant.primary_color } : {}}
              >
                {tab === 'dashboard' && <LayoutDashboard className="w-4 h-4 mr-1" />}
                {tab === 'clients' && <Users className="w-4 h-4 mr-1" />}
                {tab === 'payments' && <CreditCard className="w-4 h-4 mr-1" />}
                {tab === 'projects' && <Building2 className="w-4 h-4 mr-1" />}
                {tab === 'settings' && <Settings className="w-4 h-4 mr-1" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
            ))}
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8" style={{ color: tenant.primary_color }} />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Clients</p>
                        <p className="text-2xl font-bold">{mockStats.totalClients}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Collected</p>
                        <p className="text-2xl font-bold text-green-600">
                          KES {mockStats.totalCollected.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-amber-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Outstanding</p>
                        <p className="text-2xl font-bold text-amber-600">
                          KES {mockStats.totalReceivables.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-8 h-8" style={{ color: tenant.secondary_color }} />
                      <div>
                        <p className="text-sm text-muted-foreground">Active Projects</p>
                        <p className="text-2xl font-bold">{mockStats.activeProjects}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Completed Payments</p>
                      <p className="text-xl font-bold text-green-700">{mockStats.completedClients}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Overdue Payments</p>
                      <p className="text-xl font-bold text-amber-700">{mockStats.overduePayments}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <PieChart className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Collection Rate</p>
                      <p className="text-xl font-bold text-blue-700">69%</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Payments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Recent Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Receipt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockRecentPayments.slice(0, 4).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.date}</TableCell>
                          <TableCell className="font-medium">{payment.client}</TableCell>
                          <TableCell className="text-right text-green-600">
                            KES {payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.method}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{payment.receipt}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Client Management</CardTitle>
                    <CardDescription>View and manage all client records</CardDescription>
                  </div>
                  <Button style={{ backgroundColor: tenant.primary_color }}>
                    + Add Client
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Plot</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{client.project}</TableCell>
                        <TableCell>{client.plot}</TableCell>
                        <TableCell className="text-right">
                          {client.balance > 0 ? (
                            <span className="text-amber-600">KES {client.balance.toLocaleString()}</span>
                          ) : (
                            <span className="text-green-600">Fully Paid</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(client.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">View</Button>
                            <Button variant="outline" size="sm">Payment</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Track all payment transactions</CardDescription>
                  </div>
                  <Button style={{ backgroundColor: tenant.primary_color }}>
                    Record Payment
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
                    {mockRecentPayments.map((payment) => (
                      <TableRow key={payment.id}>
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
                        <TableCell className="font-mono text-sm">{payment.receipt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Project Management</CardTitle>
                    <CardDescription>Manage real estate projects and plot inventory</CardDescription>
                  </div>
                  <Button style={{ backgroundColor: tenant.primary_color }}>
                    + New Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {mockProjects.map((project) => (
                    <Card key={project.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{project.name}</h3>
                            <p className="text-sm text-muted-foreground">{project.location}</p>
                          </div>
                          <div className="flex gap-4 text-center">
                            <div>
                              <p className="text-2xl font-bold" style={{ color: tenant.primary_color }}>
                                {project.totalPlots}
                              </p>
                              <p className="text-xs text-muted-foreground">Total Plots</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-green-600">{project.soldPlots}</p>
                              <p className="text-xs text-muted-foreground">Sold</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-amber-600">{project.availablePlots}</p>
                              <p className="text-xs text-muted-foreground">Available</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                width: `${(project.soldPlots / project.totalPlots) * 100}%`,
                                backgroundColor: tenant.primary_color
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round((project.soldPlots / project.totalPlots) * 100)}% sold
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Company Settings</CardTitle>
                  <CardDescription>Manage branding and company information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Company Name</p>
                        <p className="text-sm text-muted-foreground">{tenant.name}</p>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Brand Colors</p>
                        <div className="flex gap-2 mt-1">
                          <div 
                            className="w-6 h-6 rounded-full border" 
                            style={{ backgroundColor: tenant.primary_color }}
                            title="Primary"
                          />
                          <div 
                            className="w-6 h-6 rounded-full border" 
                            style={{ backgroundColor: tenant.secondary_color }}
                            title="Secondary"
                          />
                          <div 
                            className="w-6 h-6 rounded-full border" 
                            style={{ backgroundColor: tenant.accent_color }}
                            title="Accent"
                          />
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Customize</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Domain</p>
                        <p className="text-sm text-muted-foreground">{tenant.domain || 'Not configured'}</p>
                      </div>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Footer Notice */}
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <strong>Preview Mode:</strong> This is a simulation showing how {tenant.name}'s dashboard would look. 
              No actual tenant data is displayed. Use "Access" to view real data.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
