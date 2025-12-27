import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClientTable from '@/components/ClientTable';
import ClientForm from '@/components/ClientForm';
import PaymentForm from '@/components/PaymentForm';
import { PaymentHistory } from '@/components/PaymentHistory';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { Client, ReceiptData } from '@/types/client';
import {
  getClients,
  addClient,
  updateClient,
  deleteClient,
  addPayment,
  generateReceiptNumber,
  formatCurrency,
} from '@/lib/supabaseStorage';
import { generatePDFReceipt } from '@/lib/pdfGenerator';
import { LayoutDashboard, FileText, Users, TrendingUp, Wallet, BadgeDollarSign } from 'lucide-react';

const Index = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await getClients();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setSelectedClient(null);
    setClientFormOpen(true);
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setClientFormOpen(true);
  };

  const handleDelete = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleAddPayment = (client: Client) => {
    setSelectedClient(client);
    setPaymentFormOpen(true);
  };

  const handleViewHistory = (client: Client) => {
    setSelectedClient(client);
    setPaymentHistoryOpen(true);
  };

  const handleClientFormSubmit = async (data: any) => {
    try {
      if (selectedClient) {
        const discountedPrice = data.totalPrice - data.discount;
        await updateClient(selectedClient.id, {
          name: data.name,
          phone: data.phone,
          project_name: data.projectName,
          plot_number: data.plotNumber,
          total_price: data.totalPrice,
          discount: data.discount,
          sales_agent: data.salesAgent,
          balance: discountedPrice - selectedClient.total_paid,
        });
        toast.success('Client updated successfully!');
      } else {
        const discountedPrice = data.totalPrice - data.discount;
        const initialBalance = discountedPrice - data.initialPayment;
        
        const newClient = await addClient({
          name: data.name,
          phone: data.phone,
          project_name: data.projectName,
          plot_number: data.plotNumber,
          unit_price: data.totalPrice,
          number_of_plots: 1,
          total_price: data.totalPrice,
          discount: data.discount,
          total_paid: data.initialPayment,
          balance: initialBalance,
          sales_agent: data.salesAgent,
          commission: 0,
          commission_received: 0,
          commission_balance: 0,
          payment_period: '',
          completion_date: null,
          next_payment_date: null,
          notes: '',
          status: 'ongoing',
          sale_date: new Date().toISOString().split('T')[0],
        });

        if (data.initialPayment > 0) {
          await addPayment({
            client_id: newClient.id,
            amount: data.initialPayment,
            payment_method: 'Cash',
            payment_date: new Date().toISOString(),
            previous_balance: discountedPrice,
            new_balance: initialBalance,
            receipt_number: generateReceiptNumber(),
            agent_name: data.salesAgent,
            notes: 'Initial payment at registration',
          });
        }

        toast.success('Client added successfully!');
      }

      await loadClients();
      setClientFormOpen(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Failed to save client');
    }
  };

  const handlePaymentSubmit = async (data: any, receiptData: ReceiptData) => {
    if (!selectedClient) return;

    try {
      const newBalance = selectedClient.balance - data.amount;
      const newTotalPaid = selectedClient.total_paid + data.amount;

      await updateClient(selectedClient.id, {
        total_paid: newTotalPaid,
        balance: newBalance,
      });

      await addPayment({
        client_id: selectedClient.id,
        amount: data.amount,
        payment_method: data.paymentMethod,
        payment_date: new Date().toISOString(),
        previous_balance: selectedClient.balance,
        new_balance: newBalance,
        receipt_number: receiptData.receiptNumber,
        agent_name: data.agentName,
      });

      toast.success('Payment recorded successfully!');
      await loadClients();
      setPaymentFormOpen(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedClient) return;

    try {
      await deleteClient(selectedClient.id);
      toast.success('Client deleted successfully!');
      await loadClients();
      setDeleteDialogOpen(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    }
  };

  const handleGeneratePDF = (receiptData: ReceiptData) => {
    generatePDFReceipt(receiptData);
    toast.success('PDF receipt generated!');
  };

  // Dashboard summary calculations
  const totalClients = clients.length;
  const totalReceivables = clients.reduce((sum, c) => sum + c.balance, 0);
  const totalCollected = clients.reduce((sum, c) => sum + c.total_paid, 0);
  
  // Accounting summary (YTD totals from Excel bottom section)
  const totalSalesValue = clients.reduce((sum, c) => sum + c.total_price, 0);
  const totalDiscount = clients.reduce((sum, c) => sum + c.discount, 0);
  const totalCommission = clients.reduce((sum, c) => sum + c.commission, 0);
  const totalCommissionReceived = clients.reduce((sum, c) => sum + c.commission_received, 0);
  const totalCommissionBalance = clients.reduce((sum, c) => sum + c.commission_balance, 0);
  const completedClients = clients.filter(c => c.status === 'completed' || c.balance === 0).length;
  const ongoingClients = clients.filter(c => c.status === 'ongoing' && c.balance > 0).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-right" />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
          <div className="bg-card rounded-lg p-6 card-shadow card-hover">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-heading font-bold text-foreground">{totalClients}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6 card-shadow card-hover">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary/10">
                <FileText className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-heading font-bold text-primary">
                  KES {totalCollected.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6 card-shadow card-hover">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent">
                <LayoutDashboard className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-2xl font-heading font-bold text-foreground">
                  KES {totalReceivables.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Accounting Summary Section (YTD Totals) */}
        <div className="bg-card rounded-lg p-6 card-shadow mb-8 animate-fade-in">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            YTD Accounting Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Sales Value</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalSalesValue)}</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Discount</p>
              <p className="text-lg font-bold text-orange-600">{formatCurrency(totalDiscount)}</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Collected</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(totalCollected)}</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Balance</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(totalReceivables)}</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Commission</p>
              <p className="text-lg font-bold text-secondary">{formatCurrency(totalCommission)}</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Comm. Received</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalCommissionReceived)}</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Comm. Balance</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(totalCommissionBalance)}</p>
            </div>
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Completed: <span className="font-semibold text-foreground">{completedClients}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeDollarSign className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-muted-foreground">Ongoing: <span className="font-semibold text-foreground">{ongoingClients}</span></span>
            </div>
          </div>
        </div>

        <ClientTable
          clients={clients}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddPayment={handleAddPayment}
          onViewHistory={handleViewHistory}
          onAddNew={handleAddNew}
        />
      </main>

      <Footer />

      <ClientForm
        open={clientFormOpen}
        onClose={() => {
          setClientFormOpen(false);
          setSelectedClient(null);
        }}
        onSubmit={handleClientFormSubmit}
        client={selectedClient}
      />

      <PaymentForm
        open={paymentFormOpen}
        onClose={() => {
          setPaymentFormOpen(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
        onSubmit={handlePaymentSubmit}
        onGeneratePDF={handleGeneratePDF}
      />

      <PaymentHistory
        open={paymentHistoryOpen}
        onClose={() => {
          setPaymentHistoryOpen(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
        onClientUpdated={loadClients}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedClient(null);
        }}
        onConfirm={handleConfirmDelete}
        client={selectedClient}
      />
    </div>
  );
};

export default Index;
