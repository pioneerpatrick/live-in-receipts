import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClientTable from '@/components/ClientTable';
import ClientForm from '@/components/ClientForm';
import PaymentForm from '@/components/PaymentForm';
import { PaymentHistory } from '@/components/PaymentHistory';
import { ExcelUploadDialog } from '@/components/ExcelUploadDialog';
import { PaymentReminders } from '@/components/PaymentReminders';
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
import { useAuth } from '@/hooks/useAuth';
import { logActivity } from '@/lib/activityLogger';
import { LayoutDashboard, FileText, Users, TrendingUp, Wallet, BadgeDollarSign } from 'lucide-react';

const Index = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  
  const [clients, setClients] = useState<Client[]>([]);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [excelUploadOpen, setExcelUploadOpen] = useState(false);
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
        
        await logActivity({
          action: 'client_updated',
          entityType: 'client',
          entityId: selectedClient.id,
          details: { name: data.name },
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
          payment_type: data.paymentType || 'installments',
          payment_period: data.installmentMonths ? `${data.installmentMonths} months` : '',
          installment_months: data.paymentType === 'installments' ? (data.installmentMonths || null) : null,
          initial_payment_method: data.initialPaymentMethod || 'Cash',
          completion_date: null,
          next_payment_date: data.paymentType === 'installments' && data.installmentMonths 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
            : null,
          notes: '',
          status: data.paymentType === 'cash' ? 'completed' : 'ongoing',
          sale_date: new Date().toISOString().split('T')[0],
        });

        if (data.initialPayment > 0) {
          await addPayment({
            client_id: newClient.id,
            amount: data.initialPayment,
            payment_method: data.initialPaymentMethod || 'Cash',
            payment_date: new Date().toISOString(),
            previous_balance: discountedPrice,
            new_balance: initialBalance,
            receipt_number: generateReceiptNumber(),
            agent_name: data.salesAgent,
            notes: 'Initial payment at registration',
          });
        }

        await logActivity({
          action: 'client_created',
          entityType: 'client',
          entityId: newClient.id,
          details: { name: data.name, project: data.projectName },
        });

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

      await logActivity({
        action: 'payment_added',
        entityType: 'payment',
        details: { 
          client_name: selectedClient.name,
          amount: data.amount,
          receipt: receiptData.receiptNumber,
        },
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
      
      await logActivity({
        action: 'client_deleted',
        entityType: 'client',
        entityId: selectedClient.id,
        details: { name: selectedClient.name },
      });
      
      toast.success('Client deleted successfully!');
      await loadClients();
      setDeleteDialogOpen(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    }
  };

  const handleGeneratePDF = async (receiptData: ReceiptData) => {
    await generatePDFReceipt(receiptData);
    
    await logActivity({
      action: 'receipt_generated',
      entityType: 'receipt',
      details: { 
        receipt_number: receiptData.receiptNumber,
        client_name: receiptData.clientName,
      },
    });
    
    toast.success('PDF receipt generated!');
  };

  // Dashboard summary calculations
  const totalClients = clients.length;
  const totalReceivables = clients.reduce((sum, c) => sum + c.balance, 0);
  const totalCollected = clients.reduce((sum, c) => sum + c.total_paid, 0);
  
  // Accounting summary (YTD totals)
  const totalSalesValue = clients.reduce((sum, c) => sum + c.total_price, 0);
  const totalDiscount = clients.reduce((sum, c) => sum + c.discount, 0);
  const completedClients = clients.filter(c => c.status === 'completed' || c.balance === 0).length;
  const ongoingClients = clients.filter(c => c.status === 'ongoing' && c.balance > 0).length;

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      <Toaster position="top-right" />
      <Header />
      
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
        {/* Main Stats Cards - Admin Only */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 animate-fade-in">
            <div className="bg-card rounded-lg p-4 sm:p-6 card-shadow card-hover">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-primary/10 flex-shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-xl sm:text-2xl font-heading font-bold text-foreground">{totalClients}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 sm:p-6 card-shadow card-hover">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-secondary/10 flex-shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Collected</p>
                  <p className="text-xl sm:text-2xl font-heading font-bold text-primary truncate">
                    KES {totalCollected.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 sm:p-6 card-shadow card-hover sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-accent flex-shrink-0">
                  <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Outstanding Balance</p>
                  <p className="text-xl sm:text-2xl font-heading font-bold text-foreground truncate">
                    KES {totalReceivables.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accounting Summary Section (YTD Totals) - Admin Only */}
        {isAdmin && (
          <div className="bg-card rounded-lg p-4 sm:p-6 card-shadow mb-6 sm:mb-8 animate-fade-in">
            <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              YTD Accounting Summary
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div className="text-center p-2 sm:p-3 bg-muted/30 rounded-lg">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Sales Value</p>
                <p className="text-sm sm:text-lg font-bold text-foreground truncate">{formatCurrency(totalSalesValue)}</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-muted/30 rounded-lg">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Discount</p>
                <p className="text-sm sm:text-lg font-bold text-orange-600 truncate">{formatCurrency(totalDiscount)}</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-muted/30 rounded-lg">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Collected</p>
                <p className="text-sm sm:text-lg font-bold text-primary truncate">{formatCurrency(totalCollected)}</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-muted/30 rounded-lg">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Balance</p>
                <p className="text-sm sm:text-lg font-bold text-destructive truncate">{formatCurrency(totalReceivables)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                <span className="text-xs sm:text-sm text-muted-foreground">Completed: <span className="font-semibold text-foreground">{completedClients}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <BadgeDollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                <span className="text-xs sm:text-sm text-muted-foreground">Ongoing: <span className="font-semibold text-foreground">{ongoingClients}</span></span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Reminders Section */}
        <div className="mb-6 sm:mb-8">
          <PaymentReminders 
            clients={clients} 
            onSelectClient={(client) => {
              setSelectedClient(client);
              setPaymentFormOpen(true);
            }} 
          />
        </div>

        <ClientTable
          clients={clients}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddPayment={handleAddPayment}
          onViewHistory={handleViewHistory}
          onAddNew={handleAddNew}
          onImportExcel={() => setExcelUploadOpen(true)}
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

      <ExcelUploadDialog
        open={excelUploadOpen}
        onClose={() => setExcelUploadOpen(false)}
        onImportComplete={loadClients}
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
