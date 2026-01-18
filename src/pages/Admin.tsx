import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountingDashboard } from '@/components/accounting/AccountingDashboard';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { PaymentRequisitions } from '@/components/accounting/PaymentRequisitions';
import { formatCurrency } from '@/lib/supabaseStorage';
import { useClientsAndPayments } from '@/hooks/useDataCache';
import { BarChart3, RefreshCw, TrendingUp, DollarSign, Users, Wallet, FileCheck } from 'lucide-react';

const Admin = () => {
  const { role } = useAuth();
  const { clients, payments, isLoading: loading, refetch: loadAllData } = useClientsAndPayments();
  const [timeRange, setTimeRange] = useState('all');

  // Calculate stats
  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalReceivables = clients.reduce((sum, c) => sum + Number(c.balance), 0);
  const totalClients = clients.length;

  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Accounting Panel</h1>
              <p className="text-sm text-muted-foreground">Financial reports and analytics</p>
            </div>
          </div>
          <Button onClick={loadAllData} variant="outline" className="flex items-center gap-2" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Wallet className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Receivables</p>
                  <p className="text-xl font-bold">{formatCurrency(totalReceivables)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-xl font-bold">{totalClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="accounting" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="accounting" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Accounting</span>
            </TabsTrigger>
            <TabsTrigger value="requisitions" className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Requisitions</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Accounting Tab */}
          <TabsContent value="accounting">
            <AccountingDashboard 
              clients={clients}
              payments={payments}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </TabsContent>

          {/* Payment Requisitions Tab */}
          <TabsContent value="requisitions">
            <PaymentRequisitions 
              payments={payments}
              clients={clients}
              onRefresh={loadAllData}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsDashboard clients={clients} payments={payments} timeRange={timeRange} onTimeRangeChange={setTimeRange} />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
