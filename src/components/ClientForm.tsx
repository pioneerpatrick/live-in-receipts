import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Client } from '@/types/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  projectName: z.string().min(1, 'Project name is required'),
  plotNumber: z.string().min(1, 'Plot number is required'),
  totalPrice: z.coerce.number().min(1, 'Total price must be greater than 0'),
  discount: z.coerce.number().min(0, 'Discount cannot be negative'),
  initialPayment: z.coerce.number().min(0, 'Initial payment cannot be negative'),
  salesAgent: z.string().min(1, 'Sales agent is required'),
  paymentType: z.enum(['installments', 'cash']),
  initialPaymentMethod: z.enum(['Cash', 'M-Pesa', 'Bank']),
  installmentMonths: z.coerce.number().min(1).optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ClientFormData) => void;
  client?: Client | null;
}

const ClientForm = ({ open, onClose, onSubmit, client }: ClientFormProps) => {
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      phone: '',
      projectName: '',
      plotNumber: '',
      totalPrice: 0,
      discount: 0,
      initialPayment: 0,
      salesAgent: '',
      paymentType: 'installments',
      initialPaymentMethod: 'Cash',
      installmentMonths: undefined,
    },
  });

  const paymentType = form.watch('paymentType');

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        phone: client.phone,
        projectName: client.project_name,
        plotNumber: client.plot_number,
        totalPrice: client.total_price,
        discount: client.discount,
        initialPayment: client.total_paid,
        salesAgent: client.sales_agent,
        paymentType: (client.payment_type as 'installments' | 'cash') || 'installments',
        initialPaymentMethod: (client.initial_payment_method as 'Cash' | 'M-Pesa' | 'Bank') || 'Cash',
        installmentMonths: client.installment_months || undefined,
      });
    } else {
      form.reset({
        name: '',
        phone: '',
        projectName: '',
        plotNumber: '',
        totalPrice: 0,
        discount: 0,
        initialPayment: 0,
        salesAgent: '',
        paymentType: 'installments',
        initialPaymentMethod: 'Cash',
        installmentMonths: undefined,
      });
    }
  }, [client, form]);

  const handleSubmit = (data: ClientFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg sm:text-xl">
            {client ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="254712345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="plotNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plot Number</FormLabel>
                    <FormControl>
                      <Input placeholder="A-123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="totalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Price (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="500000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!client && (
                <FormField
                  control={form.control}
                  name="initialPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Payment (KES)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="salesAgent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales Agent</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter agent name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="initialPaymentMethod"
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
                        <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                        <SelectItem value="Bank">Bank Transfer</SelectItem>
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
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="installments">Installments</SelectItem>
                        <SelectItem value="cash">Cash (Full Payment)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {paymentType === 'installments' && (
                <FormField
                  control={form.control}
                  name="installmentMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Installment Period (Months)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select months" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3">3 Months</SelectItem>
                          <SelectItem value="6">6 Months</SelectItem>
                          <SelectItem value="9">9 Months</SelectItem>
                          <SelectItem value="12">12 Months</SelectItem>
                          <SelectItem value="18">18 Months</SelectItem>
                          <SelectItem value="24">24 Months</SelectItem>
                          <SelectItem value="36">36 Months</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {client ? 'Update Client' : 'Add Client'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientForm;
