import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Client, Payment } from '@/types/client';
import { Loader2, FileText, Building2, MapPin, Phone, User, Mail, Globe } from 'lucide-react';
import logoImage from '@/assets/logo.jpg';

interface CompanySettings {
  company_name: string;
  company_tagline: string | null;
  phone: string | null;
  email: string | null;
  email_secondary: string | null;
  website: string | null;
  address: string | null;
  po_box: string | null;
  logo_url: string | null;
}

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
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scroll to top when component mounts to ensure page is fully visible
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!clientId) {
        setError('Invalid client ID');
        setLoading(false);
        return;
      }

      try {
        // Fetch company settings
        const { data: settingsData } = await supabase
          .from('company_settings')
          .select('*')
          .maybeSingle();

        if (settingsData) {
          setCompanySettings(settingsData as CompanySettings);
        } else {
          // Default settings if none found
          setCompanySettings({
            company_name: 'LIVE-IN PROPERTIES',
            company_tagline: 'Genuine plots with ready title deeds',
            phone: '+254 746 499 499',
            email: 'liveinpropertiesltd@gmail.com',
            email_secondary: 'info@liveinproperties.co.ke',
            website: 'www.liveinproperties.co.ke',
            address: 'Kitengela Africa House',
            po_box: 'P.O. Box 530-00241, KITENGELA',
            logo_url: null,
          });
        }

        // Use the public function to fetch client and payment data (bypasses RLS)
        const { data: historyData, error: historyError } = await supabase
          .rpc('get_client_payment_history', { p_client_id: clientId });

        if (historyError) throw historyError;
        
        if (!historyData || historyData.length === 0) {
          setError('Client not found');
          setLoading(false);
          return;
        }

        // Extract client data from first row
        const firstRow = historyData[0];
        const clientData: Client = {
          id: firstRow.client_id,
          name: firstRow.client_name,
          phone: firstRow.client_phone || '',
          project_name: firstRow.project_name,
          plot_number: firstRow.plot_number,
          total_price: firstRow.total_price,
          discount: firstRow.discount,
          total_paid: firstRow.total_paid,
          balance: firstRow.balance,
          percent_paid: firstRow.percent_paid,
          unit_price: 0,
          number_of_plots: 1,
          sales_agent: '',
          payment_type: '',
          payment_period: '',
          installment_months: null,
          initial_payment_method: '',
          completion_date: null,
          next_payment_date: null,
          notes: '',
          status: firstRow.balance === 0 ? 'completed' : 'ongoing',
          sale_date: null,
          commission: null,
          commission_received: null,
          commission_balance: null,
          created_at: '',
          updated_at: '',
        };
        setClient(clientData);

        // Extract payments (filter out null payment_id rows which indicate no payments)
        const paymentsData: Payment[] = historyData
          .filter((row: any) => row.payment_id !== null)
          .map((row: any) => ({
            id: row.payment_id,
            client_id: row.client_id,
            amount: row.payment_amount,
            payment_method: row.payment_method,
            payment_date: row.payment_date,
            previous_balance: row.previous_balance,
            new_balance: row.new_balance,
            receipt_number: row.receipt_number,
            agent_name: '',
            created_at: '',
          }));
        setPayments(paymentsData);
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

  if (error || !client || !companySettings) {
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
  const logoSrc = companySettings.logo_url || logoImage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <img src={logoSrc} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
              <div className="flex-1">
                <CardTitle className="text-xl text-primary">{companySettings.company_name}</CardTitle>
                {companySettings.company_tagline && (
                  <p className="text-sm text-muted-foreground">{companySettings.company_tagline}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                  {companySettings.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {companySettings.phone}
                    </span>
                  )}
                  {companySettings.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {companySettings.email}
                    </span>
                  )}
                  {companySettings.website && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {companySettings.website}
                    </span>
                  )}
                </div>
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
              <ScrollArea className="max-h-[50vh] [&>[data-radix-scroll-area-viewport]]:max-h-[50vh]">
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
          <p>{companySettings.company_name}</p>
          <p>{companySettings.po_box || companySettings.address}</p>
        </div>
      </div>
    </div>
  );
};

export default ClientPaymentHistory;