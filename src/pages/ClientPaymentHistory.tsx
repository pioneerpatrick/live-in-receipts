import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Client, Payment } from '@/types/client';
import { Loader2, FileText, Building2, MapPin, Phone, User } from 'lucide-react';
import logoImage from '@/assets/logo.jpg';

const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString()}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const ClientPaymentHistory = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!clientId) {
        setError('Invalid client ID');
        setLoading(false);
        return;
      }

      try {
        // Fetch client data
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (clientError) throw clientError;
        if (!clientData) {
          setError('Client not found');
          setLoading(false);
          return;
        }

        setClient(clientData as Client);

        // Fetch payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('client_id', clientId)
          .order('payment_date', { ascending: false });

        if (paymentsError) throw paymentsError;
        setPayments((paymentsData || []) as Payment[]);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load payment history');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">{error || 'Client not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const discountedPrice = client.total_price - client.discount;
  const percentPaid = client.percent_paid ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <img src={logoImage} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
              <div>
                <CardTitle className="text-xl text-primary">LIVE-IN PROPERTIES LIMITED</CardTitle>
                <p className="text-sm text-muted-foreground">Payment History</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Client Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{client.name}</span>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{client.project_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Plot: {client.plot_number}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Price</p>
                <p className="font-bold text-lg">{formatCurrency(discountedPrice)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Paid</p>
                <p className="font-bold text-lg text-green-600">{formatCurrency(client.total_paid)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Balance</p>
                <p className="font-bold text-lg text-primary">{formatCurrency(client.balance)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={client.balance === 0 ? 'default' : 'secondary'} className="mt-1">
                  {client.balance === 0 ? 'Completed' : 'Ongoing'}
                </Badge>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-medium">{percentPaid.toFixed(1)}%</span>
              </div>
              <div className="bg-muted rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(percentPaid, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No payments recorded yet.</p>
            ) : (
              <ScrollArea className="max-h-[400px]">
                {/* Mobile Card View */}
                <div className="block md:hidden space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="bg-muted/30 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">{payment.receipt_number}</p>
                          <p className="text-sm">{formatDate(payment.payment_date)}</p>
                        </div>
                        <p className="font-bold text-primary">{formatCurrency(payment.amount)}</p>
                      </div>
                      <div className="flex justify-between text-xs">
                        <Badge variant="outline">{payment.payment_method}</Badge>
                        <span className="text-muted-foreground">
                          Balance: {formatCurrency(payment.new_balance)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt No.</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Balance After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">{payment.receipt_number}</TableCell>
                          <TableCell>{formatDate(payment.payment_date)}</TableCell>
                          <TableCell className="text-right font-medium text-primary">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.payment_method}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(payment.new_balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pb-4">
          <p>LIVE-IN PROPERTIES LIMITED</p>
          <p>P.O. Box 530-00241, Kitengela</p>
        </div>
      </div>
    </div>
  );
};

export default ClientPaymentHistory;
