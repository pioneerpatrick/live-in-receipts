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
} from '@/lib/storage';
import { generatePDFReceipt } from '@/lib/pdfGenerator';
import { LayoutDashboard, FileText, Users } from 'lucide-react';

const Index = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = () => {
    const data = getClients();
    setClients(data);
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

  const handleClientFormSubmit = (data: any) => {
    if (selectedClient) {
      // Update existing client
      const discountedPrice = data.totalPrice - data.discount;
      updateClient(selectedClient.id, {
        name: data.name,
        phone: data.phone,
        projectName: data.projectName,
        plotNumber: data.plotNumber,
        totalPrice: data.totalPrice,
        discount: data.discount,
        salesAgent: data.salesAgent,
        balance: discountedPrice - selectedClient.totalPaid,
      });
      toast.success('Client updated successfully!');
    } else {
      // Add new client
      const discountedPrice = data.totalPrice - data.discount;
      const initialBalance = discountedPrice - data.initialPayment;
      
      const newClient = addClient({
        name: data.name,
        phone: data.phone,
        projectName: data.projectName,
        plotNumber: data.plotNumber,
        totalPrice: data.totalPrice,
        discount: data.discount,
        totalPaid: data.initialPayment,
        balance: initialBalance,
        salesAgent: data.salesAgent,
      });

      // Create initial payment record if there's an initial payment
      if (data.initialPayment > 0) {
        addPayment({
          clientId: newClient.id,
          amount: data.initialPayment,
          paymentMethod: 'Cash',
          paymentDate: new Date().toISOString(),
          previousBalance: discountedPrice,
          newBalance: initialBalance,
          receiptNumber: generateReceiptNumber(),
          agentName: data.salesAgent,
          notes: 'Initial payment at registration',
        });
      }

      toast.success('Client added successfully!');
    }

    loadClients();
    setClientFormOpen(false);
    setSelectedClient(null);
  };

  const handlePaymentSubmit = (data: any, receiptData: ReceiptData) => {
    if (!selectedClient) return;

    const newBalance = selectedClient.balance - data.amount;
    const newTotalPaid = selectedClient.totalPaid + data.amount;

    // Update client balance
    updateClient(selectedClient.id, {
      totalPaid: newTotalPaid,
      balance: newBalance,
    });

    // Record the payment
    addPayment({
      clientId: selectedClient.id,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentDate: new Date().toISOString(),
      previousBalance: selectedClient.balance,
      newBalance: newBalance,
      receiptNumber: receiptData.receiptNumber,
      agentName: data.agentName,
    });

    toast.success('Payment recorded successfully!');
    loadClients();
    setPaymentFormOpen(false);
    setSelectedClient(null);
  };

  const handleConfirmDelete = () => {
    if (!selectedClient) return;

    deleteClient(selectedClient.id);
    toast.success('Client deleted successfully!');
    loadClients();
    setDeleteDialogOpen(false);
    setSelectedClient(null);
  };

  const handleGeneratePDF = (receiptData: ReceiptData) => {
    generatePDFReceipt(receiptData);
    toast.success('PDF receipt generated!');
  };

  // Stats
  const totalClients = clients.length;
  const totalReceivables = clients.reduce((sum, c) => sum + c.balance, 0);
  const totalCollected = clients.reduce((sum, c) => sum + c.totalPaid, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-right" />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Stats Cards */}
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

        {/* Client Table */}
        <ClientTable
          clients={clients}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddPayment={handleAddPayment}
          onAddNew={handleAddNew}
        />
      </main>

      <Footer />

      {/* Modals */}
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
