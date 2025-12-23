import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClientTable from '@/components/ClientTable';
import ClientForm from '@/components/ClientForm';
import PaymentForm from '@/components/PaymentForm';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { Client, ReceiptData } from '@/types/client';
import {
  getClients,
  addClient,
  updateClient,
  deleteClient,
  addPayment,
  generateReceiptNumber,
} from '@/lib/supabaseStorage';
import { generatePDFReceipt } from '@/lib/pdfGenerator';
import { LayoutDashboard, FileText, Users } from 'lucide-react';

const Index = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
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

  const totalClients = clients.length;
  const totalReceivables = clients.reduce((sum, c) => sum + c.balance, 0);
  const totalCollected = clients.reduce((sum, c) => sum + c.total_paid, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-right" />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
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

        <ClientTable
          clients={clients}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddPayment={handleAddPayment}
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
