import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Client } from '@/types/client';
import { Project, Plot } from '@/types/project';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getProjects, getPlots } from '@/lib/projectStorage';
import { formatCurrency } from '@/lib/supabaseStorage';

const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  projectName: z.string().min(1, 'Project name is required'),
  selectedPlots: z.array(z.string()).min(1, 'At least one plot must be selected'),
  totalPrice: z.coerce.number().min(1, 'Total price must be greater than 0'),
  discount: z.coerce.number().min(0, 'Discount cannot be negative'),
  initialPayment: z.coerce.number().min(0, 'Initial payment cannot be negative'),
  salesAgent: z.string().min(1, 'Sales agent is required'),
  paymentType: z.enum(['installments', 'cash']),
  initialPaymentMethod: z.enum(['Cash', 'M-Pesa', 'Bank']),
  installmentMonths: z.coerce.number().min(1).optional(),
  commission: z.coerce.number().min(0, 'Commission cannot be negative').optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ClientFormData & { plotDetails: Plot[] }) => void;
  client?: Client | null;
}

const ClientForm = ({ open, onClose, onSubmit, client }: ClientFormProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [availablePlots, setAvailablePlots] = useState<Plot[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingPlots, setIsLoadingPlots] = useState(false);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      projectName: '',
      selectedPlots: [],
      totalPrice: 0,
      discount: 0,
      initialPayment: 0,
      salesAgent: '',
      paymentType: 'installments',
      initialPaymentMethod: 'Cash',
      installmentMonths: undefined,
      commission: 0,
    },
  });

  const paymentType = form.watch('paymentType');
  const selectedProjectName = form.watch('projectName');
  const selectedPlots = form.watch('selectedPlots');

  // Fetch projects when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoadingProjects(true);
      getProjects()
        .then(setProjects)
        .catch(console.error)
        .finally(() => setIsLoadingProjects(false));
    }
  }, [open]);

  // Fetch plots when project is selected
  useEffect(() => {
    if (selectedProjectName && !client) {
      const selectedProject = projects.find(p => p.name === selectedProjectName);
      if (selectedProject) {
        setIsLoadingPlots(true);
        getPlots(selectedProject.id)
          .then((allPlots) => {
            setPlots(allPlots);
            // Filter to only available plots
            const available = allPlots.filter(p => p.status === 'available');
            setAvailablePlots(available);
          })
          .catch(console.error)
          .finally(() => setIsLoadingPlots(false));
      }
    }
  }, [selectedProjectName, projects, client]);

  // Auto-calculate total price when plots selection changes
  useEffect(() => {
    if (selectedPlots.length > 0 && !client) {
      const totalPrice = selectedPlots.reduce((sum, plotNumber) => {
        const plot = plots.find(p => p.plot_number === plotNumber);
        return sum + (plot?.price || 0);
      }, 0);
      form.setValue('totalPrice', totalPrice);
    } else if (selectedPlots.length === 0 && !client) {
      form.setValue('totalPrice', 0);
    }
  }, [selectedPlots, plots, form, client]);

  useEffect(() => {
    if (client) {
      // Parse plot numbers from comma-separated string
      const plotNumbers = client.plot_number.split(', ').filter(p => p.trim());
      form.reset({
        name: client.name,
        phone: client.phone,
        email: client.email || '',
        projectName: client.project_name,
        selectedPlots: plotNumbers,
        totalPrice: client.total_price,
        discount: client.discount,
        initialPayment: client.total_paid,
        salesAgent: client.sales_agent,
        paymentType: (client.payment_type as 'installments' | 'cash') || 'installments',
        initialPaymentMethod: (client.initial_payment_method as 'Cash' | 'M-Pesa' | 'Bank') || 'Cash',
        installmentMonths: client.installment_months || undefined,
        commission: client.commission || 0,
      });
    } else {
      form.reset({
        name: '',
        phone: '',
        email: '',
        projectName: '',
        selectedPlots: [],
        totalPrice: 0,
        discount: 0,
        initialPayment: 0,
        salesAgent: '',
        paymentType: 'installments',
        initialPaymentMethod: 'Cash',
        installmentMonths: undefined,
        commission: 0,
      });
      setPlots([]);
      setAvailablePlots([]);
    }
  }, [client, form]);

  const handlePlotToggle = (plotNumber: string, checked: boolean) => {
    const currentPlots = form.getValues('selectedPlots');
    if (checked) {
      form.setValue('selectedPlots', [...currentPlots, plotNumber]);
    } else {
      form.setValue('selectedPlots', currentPlots.filter(p => p !== plotNumber));
    }
  };

  const handleSubmit = (data: ClientFormData) => {
    // Get the full plot details for selected plots
    const plotDetails = data.selectedPlots
      .map(plotNumber => plots.find(p => p.plot_number === plotNumber))
      .filter((p): p is Plot => p !== undefined);
    
    onSubmit({ ...data, plotDetails });
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

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address (Optional - for reminders)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="client@example.com" {...field} />
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
                  {client ? (
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                  ) : (
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('selectedPlots', []);
                        form.setValue('totalPrice', 0);
                      }} 
                      value={field.value}
                      disabled={isLoadingProjects}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingProjects ? "Loading..." : "Select project"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.name}>
                            {project.name} ({project.location})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selectedPlots"
              render={() => (
                <FormItem>
                  <FormLabel>
                    Select Plots {selectedPlots.length > 0 && `(${selectedPlots.length} selected)`}
                  </FormLabel>
                  {client ? (
                    <FormControl>
                      <Input value={selectedPlots.join(', ')} disabled />
                    </FormControl>
                  ) : (
                    <div className="border rounded-md">
                      {!selectedProjectName ? (
                        <p className="text-sm text-muted-foreground p-3">Select a project first</p>
                      ) : isLoadingPlots ? (
                        <p className="text-sm text-muted-foreground p-3">Loading plots...</p>
                      ) : availablePlots.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-3">No available plots in this project</p>
                      ) : (
                        <ScrollArea className="h-[150px] p-3">
                          <div className="space-y-2">
                            {availablePlots.map((plot) => (
                              <div key={plot.id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50">
                                <Checkbox
                                  id={plot.id}
                                  checked={selectedPlots.includes(plot.plot_number)}
                                  onCheckedChange={(checked) => 
                                    handlePlotToggle(plot.plot_number, checked as boolean)
                                  }
                                />
                                <label
                                  htmlFor={plot.id}
                                  className="flex-1 text-sm cursor-pointer"
                                >
                                  <span className="font-medium">{plot.plot_number}</span>
                                  <span className="text-muted-foreground"> - {plot.size}</span>
                                  <span className="text-primary ml-2">({formatCurrency(plot.price)})</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

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
                name="commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Commission (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
