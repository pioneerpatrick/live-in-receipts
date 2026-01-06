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
import { PaymentHistoryImportDialog } from '@/components/PaymentHistoryImportDialog';
import { PaymentReminders } from '@/components/PaymentReminders';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { Client, Payment, ReceiptData } from '@/types/client';
import {
  getClients,
  getPayments,
  addClient,
  updateClient,
  deleteClient,
  addPayment,
  generateReceiptNumber,
  formatCurrency,
} from '@/lib/supabaseStorage';
import { getProjects, getPlots, sellPlot, returnPlot } from '@/lib/projectStorage';
import { generatePDFReceipt } from '@/lib/pdfGenerator';
import { useAuth } from '@/hooks/useAuth';
import { logActivity } from '@/lib/activityLogger';
import { LayoutDashboard, FileText, Users } from 'lucide-react';

const Index = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [excelUploadOpen, setExcelUploadOpen] = useState(false);
  const [paymentHistoryImportOpen, setPaymentHistoryImportOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsData, paymentsData] = await Promise.all([
        getClients(),
        getPayments()
      ]);
      setClients(clientsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
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
        const commissionValue = data.commission || 0;
        await updateClient(selectedClient.id, {
          name: data.name,
          phone: data.phone,
          project_name: data.projectName,
          plot_number: data.selectedPlots.join(', '),
          total_price: data.totalPrice,
          discount: data.discount,
          sales_agent: data.salesAgent,
          balance: discountedPrice - selectedClient.total_paid,
          commission: commissionValue,
          commission_balance: commissionValue - (selectedClient.commission_received || 0),
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
        const numberOfPlots = data.selectedPlots.length;
        const plotNumbersString = data.selectedPlots.join(', ');
        
        // Calculate unit price as average per plot
        const unitPrice = Math.round(data.totalPrice / numberOfPlots);
        
        const newClient = await addClient({
          name: data.name,
          phone: data.phone,
          project_name: data.projectName,
          plot_number: plotNumbersString,
          unit_price: unitPrice,
          number_of_plots: numberOfPlots,
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
          commission: data.commission || null,
          commission_received: 0,
          commission_balance: data.commission || null,
        });

        // Mark all selected plots as sold
        if (data.plotDetails && data.plotDetails.length > 0) {
          try {
            for (const plot of data.plotDetails) {
              await sellPlot(plot.id, newClient.id);
            }
          } catch (plotError) {
            console.error('Error marking plots as sold:', plotError);
            // Don't fail the whole operation if plot update fails
          }
        }

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
            notes: `Initial payment at registration for ${numberOfPlots} plot(s)`,
          });
        }

        await logActivity({
          action: 'client_created',
          entityType: 'client',
          entityId: newClient.id,
          details: { name: data.name, project: data.projectName, plots: plotNumbersString },
        });

        toast.success(`Client added with ${numberOfPlots} plot(s) successfully!`);
      }

      await loadData();
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
      const discountedPrice = selectedClient.total_price - selectedClient.discount;
      const newPercentPaid = discountedPrice > 0 ? Math.round((newTotalPaid / discountedPrice) * 100 * 100) / 100 : 0;
      const newStatus = newBalance <= 0 ? 'completed' : selectedClient.status;

      await updateClient(selectedClient.id, {
        total_paid: newTotalPaid,
        balance: newBalance,
        percent_paid: newPercentPaid,
        status: newStatus,
        completion_date: newBalance <= 0 ? new Date().toISOString().split('T')[0] : selectedClient.completion_date,
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
      await loadData();
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
      // Return all plots to available status before deleting the client
      try {
        const projects = await getProjects();
        const project = projects.find(p => p.name === selectedClient.project_name);
        if (project) {
          const allPlots = await getPlots(project.id);
          // Parse plot numbers from comma-separated string
          const clientPlotNumbers = selectedClient.plot_number.split(', ').map(p => p.trim());
          
          for (const plotNumber of clientPlotNumbers) {
            const plot = allPlots.find(p => p.plot_number === plotNumber);
            if (plot && plot.status === 'sold') {
              await returnPlot(plot.id);
            }
          }
        }
      } catch (plotError) {
        console.error('Error returning plots:', plotError);
        // Don't fail the whole operation if plot update fails
      }

      await deleteClient(selectedClient.id);
      
      await logActivity({
        action: 'client_deleted',
        entityType: 'client',
        entityId: selectedClient.id,
        details: { name: selectedClient.name },
      });
      
      toast.success('Client deleted and plots returned to available!');
      await loadData();
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
          onImportWithPayments={() => setPaymentHistoryImportOpen(true)}
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
        onClientUpdated={loadData}
      />

      <ExcelUploadDialog
        open={excelUploadOpen}
        onClose={() => setExcelUploadOpen(false)}
        onImportComplete={loadData}
      />

      <PaymentHistoryImportDialog
        open={paymentHistoryImportOpen}
        onClose={() => setPaymentHistoryImportOpen(false)}
        onImportComplete={loadData}
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
