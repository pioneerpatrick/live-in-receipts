import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Client, ReceiptData } from '@/types/client';
import { formatCurrency, generateReceiptNumber } from '@/lib/supabaseStorage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Receipt, Printer, FileText } from 'lucide-react';

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Payment amount must be greater than 0'),
  paymentMethod: z.enum(['Cash', 'Bank Transfer', 'M-Pesa', 'Cheque']),
  agentName: z.string().min(1, 'Agent name is required'),
  projectName: z.string().min(1, 'Project name is required'),
  authorizedBy: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  onSubmit: (data: PaymentFormData, receiptData: ReceiptData) => void;
  onGeneratePDF: (receiptData: ReceiptData) => void;
}

const PaymentForm = ({ open, onClose, client, onSubmit, onGeneratePDF }: PaymentFormProps) => {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptNumber] = useState(generateReceiptNumber());

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: 'M-Pesa',
      agentName: client?.sales_agent || '',
      projectName: client?.project_name || '',
      authorizedBy: '',
    },
  });

  useEffect(() => {
    if (client) {
      form.setValue('agentName', client.sales_agent);
      form.setValue('projectName', client.project_name);
    }
    setReceiptData(null);
  }, [client, form]);

  const currentAmount = form.watch('amount') || 0;
  const discountedPrice = client ? client.total_price - client.discount : 0;
  const newBalance = client ? Math.max(0, client.balance - currentAmount) : 0;
  const newTotalPaid = client ? client.total_paid + currentAmount : 0;

  const handleGenerateReceipt = (data: PaymentFormData) => {
    if (!client) return;

    const receipt: ReceiptData = {
      receiptNumber,
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      clientName: client.name,
      clientPhone: client.phone,
      projectName: data.projectName,
      plotNumber: client.plot_number,
      totalPrice: client.total_price,
      discount: client.discount,
      discountedPrice,
      currentPayment: data.amount,
      paymentMethod: data.paymentMethod,
      previousBalance: client.balance,
      remainingBalance: newBalance,
      totalPaid: newTotalPaid,
      agentName: data.agentName,
      authorizedBy: data.authorizedBy,
    };

    setReceiptData(receipt);
  };

  const handleConfirmAndSave = () => {
    if (!receiptData) return;
    const data = form.getValues();
    onSubmit(data, receiptData);
    form.reset();
    setReceiptData(null);
  };

  const handlePrintPDF = () => {
    if (receiptData) {
      onGeneratePDF(receiptData);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg sm:text-xl flex items-center gap-2">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Generate Payment Receipt
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:gap-6">
          <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
            <h3 className="font-semibold mb-2 text-sm sm:text-base">Client Summary</h3>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs sm:text-sm">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium truncate">{client.name}</span>
              <span className="text-muted-foreground">Phone:</span>
              <span className="truncate">{client.phone}</span>
              <span className="text-muted-foreground">Project:</span>
              <span className="truncate">{client.project_name}</span>
              <span className="text-muted-foreground">Plot:</span>
              <span>{client.plot_number}</span>
              <span className="text-muted-foreground">Total Price:</span>
              <span>{formatCurrency(client.total_price)}</span>
              <span className="text-muted-foreground">Discount:</span>
              <span className="text-primary">{formatCurrency(client.discount)}</span>
              <span className="text-muted-foreground">Discounted Price:</span>
              <span className="font-medium">{formatCurrency(discountedPrice)}</span>
              <span className="text-muted-foreground">Previous Balance:</span>
              <span className="font-bold text-destructive">{formatCurrency(client.balance)}</span>
            </div>
          </div>

          <Separator />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerateReceipt)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Amount (KES)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="agentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter agent name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter project name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="authorizedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Authorized By (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Manager name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-accent/30 rounded-lg p-3 sm:p-4 mt-3 sm:mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">New Balance After Payment:</span>
                  <span className={`text-lg sm:text-xl font-bold ${newBalance === 0 ? 'text-primary' : 'text-foreground'}`}>
                    {formatCurrency(newBalance)}
                  </span>
                </div>
                {newBalance === 0 && (
                  <p className="text-xs sm:text-sm text-primary mt-1">🎉 This payment will complete the balance!</p>
                )}
              </div>

              {!receiptData && (
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={onClose} className="order-2 sm:order-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="gap-2 order-1 sm:order-2">
                    <FileText className="w-4 h-4" />
                    Generate Receipt
                  </Button>
                </div>
              )}
            </form>
          </Form>

          {receiptData && (
            <>
              <Separator />
              <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="text-center border-b pb-3 sm:pb-4">
                  <h3 className="font-heading text-base sm:text-lg font-bold text-secondary">LIVE-IN PROPERTIES</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Genuine plots with ready title deeds</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    Email: liveinproperties2021@gmail.com | Phone: 0746499499
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs sm:text-sm">
                  <span className="text-muted-foreground">Receipt No:</span>
                  <span className="font-mono font-semibold">{receiptData.receiptNumber}</span>
                  <span className="text-muted-foreground">Date:</span>
                  <span>{receiptData.date}</span>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs sm:text-sm">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-medium truncate">{receiptData.clientName}</span>
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="truncate">{receiptData.clientPhone}</span>
                  <span className="text-muted-foreground">Project:</span>
                  <span className="truncate">{receiptData.projectName}</span>
                  <span className="text-muted-foreground">Plot No:</span>
                  <span>{receiptData.plotNumber}</span>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs sm:text-sm">
                  <span className="text-muted-foreground">Total Price:</span>
                  <span>{formatCurrency(receiptData.totalPrice)}</span>
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="text-primary">{formatCurrency(receiptData.discount)}</span>
                  <span className="text-muted-foreground">Discounted Price:</span>
                  <span>{formatCurrency(receiptData.discountedPrice)}</span>
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-bold text-primary">{formatCurrency(receiptData.currentPayment)}</span>
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span>{receiptData.paymentMethod}</span>
                  <span className="text-muted-foreground">Total Paid to Date:</span>
                  <span>{formatCurrency(receiptData.totalPaid)}</span>
                  <span className="text-muted-foreground">Remaining Balance:</span>
                  <span className={`font-bold ${receiptData.remainingBalance === 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatCurrency(receiptData.remainingBalance)}
                  </span>
                </div>

                <Separator />

                <div className="text-xs sm:text-sm">
                  <p className="text-muted-foreground">Agent: <span className="text-foreground">{receiptData.agentName}</span></p>
                  {receiptData.authorizedBy && (
                    <p className="text-muted-foreground">Authorized By: <span className="text-foreground">{receiptData.authorizedBy}</span></p>
                  )}
                </div>

                <div className="text-center text-[10px] sm:text-xs text-muted-foreground pt-3 sm:pt-4 border-t">
                  <p className="italic">Flexible 12-month payment plan available</p>
                  <p className="mt-1">Thank you for choosing Live-IN Properties. We Secure your Future.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button type="button" variant="outline" onClick={() => setReceiptData(null)} className="order-3 sm:order-1">
                  Edit Details
                </Button>
                <Button type="button" variant="secondary" onClick={handlePrintPDF} className="gap-2 order-2">
                  <Printer className="w-4 h-4" />
                  Print PDF
                </Button>
                <Button type="button" onClick={handleConfirmAndSave} className="gap-2 order-1 sm:order-3">
                  <Receipt className="w-4 h-4" />
                  Save & Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentForm;
