import { useState } from 'react';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { Client } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Search, Edit2, Trash2, Receipt, UserPlus, Download, Printer, History, Upload, CalendarIcon, X, Filter, CreditCard, Clock, AlertTriangle } from 'lucide-react';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onAddPayment: (client: Client) => void;
  onViewHistory: (client: Client) => void;
  onAddNew: () => void;
  onImportExcel: () => void;
  onImportWithPayments?: () => void;
}

type DateFilterType = 'none' | 'sale_date' | 'completion_date';

const ClientTable = ({ clients, onEdit, onDelete, onAddPayment, onViewHistory, onAddNew, onImportExcel, onImportWithPayments }: ClientTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('none');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'completed' | 'cancelled'>('all');

  const filteredClients = clients.filter(client => {
    // Text search filter - add null safety for optional fields
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (client.name || '').toLowerCase().includes(searchLower) ||
      (client.phone || '').includes(searchTerm) ||
      (client.plot_number || '').toLowerCase().includes(searchLower) ||
      (client.project_name || '').toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // Status filter - now includes cancelled
    if (statusFilter !== 'all') {
      const clientStatus = client.status?.toLowerCase() || 'ongoing';
      if (statusFilter === 'completed' && clientStatus !== 'completed') return false;
      if (statusFilter === 'ongoing' && clientStatus !== 'ongoing') return false;
      if (statusFilter === 'cancelled' && clientStatus !== 'cancelled') return false;
    } else {
      // By default (status = 'all'), hide cancelled clients
      if (client.status?.toLowerCase() === 'cancelled') return false;
    }

    // Date range filter
    if (dateFilterType !== 'none' && (startDate || endDate)) {
      const dateField = dateFilterType === 'sale_date' ? client.sale_date : client.completion_date;
      
      if (!dateField) return false;
      
      const clientDate = new Date(dateField);
      
      if (startDate && clientDate < startDate) return false;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (clientDate > endOfDay) return false;
      }
    }

    return true;
  });

  const clearDateFilters = () => {
    setDateFilterType('none');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = (dateFilterType !== 'none' && (startDate || endDate)) || statusFilter !== 'all';

  const getBalanceStatus = (balance: number, totalPrice: number) => {
    if (balance === 0) return 'success';
    if (balance < totalPrice * 0.5) return 'warning';
    return 'default';
  };

  const calculateMonthlyPayment = (client: Client) => {
    if (client.payment_type === 'cash' || !client.installment_months || client.balance <= 0) {
      return null;
    }
    return client.balance / client.installment_months;
  };

  const getPaymentStatus = (client: Client) => {
    if (client.balance <= 0) return 'paid';
    if (!client.next_payment_date) return 'unknown';
    
    const paymentDate = parseISO(client.next_payment_date);
    if (!isValid(paymentDate)) return 'unknown';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilDue = differenceInDays(paymentDate, today);
    
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue === 0) return 'due-today';
    if (daysUntilDue <= 7) return 'upcoming';
    return 'ok';
  };

  const getDaysOverdue = (client: Client) => {
    if (!client.next_payment_date) return 0;
    const paymentDate = parseISO(client.next_payment_date);
    if (!isValid(paymentDate)) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.abs(differenceInDays(paymentDate, today));
  };

  const handleExportCSV = () => {
    const headers = [
      '#', 'Client Name', 'Phone', 'Project', 'Plot No.', 'Unit Price', 'No. of Plots',
      'Total Price', 'Discount', 'Total Paid', '% Paid', 'Balance', 'Sales Agent', 
      'Payment Type', 'Payment Period', 'Sale Date', 'Completion Date', 'Next Payment Date', 'Status', 'Notes'
    ];

    const rows = filteredClients.map((client, index) => [
      index + 1,
      client.name,
      client.phone,
      client.project_name,
      client.plot_number,
      client.unit_price,
      client.number_of_plots,
      client.total_price,
      client.discount,
      client.total_paid,
      client.percent_paid ?? 0,
      client.balance,
      client.sales_agent,
      client.payment_type || 'installments',
      client.payment_period,
      client.sale_date || '',
      client.completion_date || '',
      client.next_payment_date || '',
      client.status,
      client.notes
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Live-IN Properties - Client Database</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #0d9488; }
            .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #0d9488; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .right { text-align: right; }
            .summary { margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; }
            .summary h3 { margin: 0 0 10px 0; }
            @media print {
              @page { size: landscape; }
            }
          </style>
        </head>
        <body>
          <h1>LIVE-IN PROPERTIES</h1>
          <p class="subtitle">Client & Payment Database - ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Client Name</th>
                <th>Phone</th>
                <th>Project</th>
                <th>Plot No.</th>
                <th class="right">Total Price</th>
                <th class="right">Discount</th>
                <th class="right">Total Paid</th>
                <th class="right">Balance</th>
                <th>Agent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredClients.map((client, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${client.name}</td>
                  <td>${client.phone}</td>
                  <td>${client.project_name}</td>
                  <td>${client.plot_number}</td>
                  <td class="right">KES ${client.total_price.toLocaleString()}</td>
                  <td class="right">KES ${client.discount.toLocaleString()}</td>
                  <td class="right">KES ${client.total_paid.toLocaleString()}</td>
                  <td class="right">KES ${client.balance.toLocaleString()}</td>
                  <td>${client.sales_agent}</td>
                  <td>${client.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            <h3>Summary</h3>
            <p>Total Clients: ${filteredClients.length}</p>
            <p>Total Collected: KES ${filteredClients.reduce((sum, c) => sum + c.total_paid, 0).toLocaleString()}</p>
            <p>Outstanding Balance: KES ${filteredClients.reduce((sum, c) => sum + c.balance, 0).toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="bg-card rounded-lg card-shadow animate-fade-in overflow-hidden">
      <div className="p-3 sm:p-4 md:p-6 border-b border-border">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col gap-3">
            <h2 className="font-heading text-lg sm:text-xl font-semibold text-foreground">
              Client & Payment Database
            </h2>
            
            {/* Search and Status Filter Row */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: 'all' | 'ongoing' | 'completed' | 'cancelled') => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Active Only</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant={showFilters ? "secondary" : "outline"} 
                size="icon" 
                onClick={() => setShowFilters(!showFilters)} 
                title="Toggle Date Filters"
                className={cn("h-9 w-9", hasActiveFilters && "border-primary text-primary")}
              >
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={onImportExcel} title="Import from Excel" className="h-9 w-9">
                <Upload className="w-4 h-4" />
              </Button>
              {onImportWithPayments && (
                <Button variant="outline" size="icon" onClick={onImportWithPayments} title="Import with Payment History" className="h-9 w-9">
                  <History className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={handleExportCSV} title="Export to CSV" className="h-9 w-9">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrint} title="Print Table" className="h-9 w-9">
                <Printer className="w-4 h-4" />
              </Button>
              <Button onClick={onAddNew} className="gap-2 h-9 ml-auto">
                <UserPlus className="w-4 h-4" />
                <span className="hidden xs:inline">Add Client</span>
                <span className="xs:hidden">Add</span>
              </Button>
            </div>
          </div>

          {/* Date Range Filters */}
          {showFilters && (
            <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Filter by</label>
                <Select value={dateFilterType} onValueChange={(value: DateFilterType) => setDateFilterType(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select date type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No filter</SelectItem>
                    <SelectItem value="sale_date">Sale Date</SelectItem>
                    <SelectItem value="completion_date">Completion Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateFilterType !== 'none' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">From</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-40 justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">To</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-40 justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearDateFilters} className="gap-1">
                      <X className="w-4 h-4" />
                      Clear
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Filter className="w-3 h-3" />
                Filtering by {dateFilterType === 'sale_date' ? 'Sale Date' : 'Completion Date'}
                {startDate && ` from ${format(startDate, 'PP')}`}
                {endDate && ` to ${format(endDate, 'PP')}`}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground px-4">
            {searchTerm || hasActiveFilters ? 'No clients found matching your filters.' : 'No clients yet. Add your first client to get started.'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredClients.map((client, index) => {
              const paymentStatus = getPaymentStatus(client);
              const isOverdue = paymentStatus === 'overdue';
              const isDueToday = paymentStatus === 'due-today';
              const isCancelled = client.status?.toLowerCase() === 'cancelled';
              
              return (
              <div 
                key={client.id} 
                className={cn(
                  "p-3 sm:p-4 transition-colors",
                  isCancelled && "bg-red-500/10 border-l-4 border-l-red-500 opacity-75",
                  !isCancelled && isOverdue && "bg-destructive/5 border-l-4 border-l-destructive",
                  !isCancelled && isDueToday && "bg-orange-500/5 border-l-4 border-l-orange-500",
                  !isCancelled && !isOverdue && !isDueToday && "hover:bg-muted/30"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn("font-medium truncate", isCancelled ? "text-red-600 line-through" : "text-foreground")}>{client.name}</p>
                      {isCancelled && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">Cancelled</Badge>
                      )}
                      {!isCancelled && isOverdue && (
                        <span className="flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          {getDaysOverdue(client)}d late
                        </span>
                      )}
                      {!isCancelled && isDueToday && (
                        <span className="text-[10px] text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                          Due today
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{client.phone}</p>
                  </div>
                  <Badge variant={isCancelled ? "destructive" : getBalanceStatus(client.balance, client.total_price) as any} className="flex-shrink-0 text-xs">
                    {formatCurrency(client.balance)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-muted-foreground">Project: </span>
                    <span className={isCancelled ? "text-red-600" : "text-foreground"}>{client.project_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Plot: </span>
                    <span className={isCancelled ? "text-red-600" : "text-foreground"}>{client.plot_number}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Paid: </span>
                    <span className={isCancelled ? "text-red-600 font-medium" : "text-primary font-medium"}>{formatCurrency(Number(client.total_paid) || 0)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Progress: </span>
                    <span className={cn("font-medium", isCancelled ? "text-red-600" : "text-foreground")}>{Math.min(100, Math.max(0, Number(client.percent_paid) || 0)).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-muted-foreground" />
                    <span className={isCancelled ? "text-red-600" : "text-foreground"}>{client.initial_payment_method || 'Cash'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className={isCancelled ? "text-red-600" : "text-foreground"}>
                      {client.payment_type === 'cash' ? 'Full' : (client.installment_months ? `${client.installment_months}mo` : 'N/A')}
                    </span>
                  </div>
                  {!isCancelled && calculateMonthlyPayment(client) && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Monthly: </span>
                      <span className="text-secondary font-medium">{formatCurrency(calculateMonthlyPayment(client)!)}/mo</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewHistory(client)}
                    className="h-8 px-2 hover:bg-blue-500/10 hover:text-blue-500"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                  {!isCancelled && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddPayment(client)}
                        className="h-8 px-2 hover:bg-primary/10 hover:text-primary"
                      >
                        <Receipt className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(client)}
                        className="h-8 px-2 hover:bg-secondary/10 hover:text-secondary"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(client)}
                        className="h-8 px-2 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold w-8 text-xs px-2">#</TableHead>
              <TableHead className="font-semibold text-xs px-2">Client</TableHead>
              <TableHead className="font-semibold text-xs px-2 hidden lg:table-cell">Phone</TableHead>
              <TableHead className="font-semibold text-xs px-2">Project</TableHead>
              <TableHead className="font-semibold text-xs px-2">Plot</TableHead>
              <TableHead className="font-semibold text-right text-xs px-2 hidden xl:table-cell">Price</TableHead>
              <TableHead className="font-semibold text-right text-xs px-2">Paid</TableHead>
              <TableHead className="font-semibold text-right text-xs px-2 w-14">%</TableHead>
              <TableHead className="font-semibold text-right text-xs px-2">Balance</TableHead>
              <TableHead className="font-semibold text-xs px-2 hidden lg:table-cell">Agent</TableHead>
              <TableHead className="font-semibold text-center text-xs px-2 hidden xl:table-cell">Period</TableHead>
              <TableHead className="font-semibold text-center text-xs px-1 w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                  {searchTerm || hasActiveFilters ? 'No clients found matching your filters.' : 'No clients yet. Add your first client to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client, index) => {
                const paymentStatus = getPaymentStatus(client);
                const isOverdue = paymentStatus === 'overdue';
                const isDueToday = paymentStatus === 'due-today';
                const isCancelled = client.status?.toLowerCase() === 'cancelled';
                
                return (
                <TableRow 
                  key={client.id} 
                  className={cn(
                    "transition-colors",
                    isCancelled && "bg-red-500/10 border-l-4 border-l-red-500 opacity-75",
                    !isCancelled && isOverdue && "bg-destructive/5 border-l-4 border-l-destructive",
                    !isCancelled && isDueToday && "bg-orange-500/5 border-l-4 border-l-orange-500",
                    !isCancelled && !isOverdue && !isDueToday && "hover:bg-muted/30"
                  )}
                >
                  <TableCell className="font-medium text-xs px-2">{index + 1}</TableCell>
                  <TableCell className="font-medium text-xs px-2">
                    <div className="flex flex-col">
                      <span className={cn("truncate", isCancelled && "text-red-600 line-through")}>{client.name}</span>
                      {isCancelled && (
                        <Badge variant="destructive" className="text-[9px] px-1 w-fit mt-0.5">Cancelled</Badge>
                      )}
                      {!isCancelled && isOverdue && (
                        <span className="flex items-center gap-0.5 text-[9px] text-destructive whitespace-nowrap">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {getDaysOverdue(client)}d late
                        </span>
                      )}
                      {!isCancelled && isDueToday && (
                        <span className="text-[9px] text-orange-600 whitespace-nowrap">
                          Due today
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-xs px-2 hidden lg:table-cell truncate", isCancelled && "text-red-600")}>{client.phone}</TableCell>
                  <TableCell className={cn("text-xs px-2 truncate", isCancelled && "text-red-600")}>{client.project_name}</TableCell>
                  <TableCell className={cn("text-xs px-2", isCancelled && "text-red-600")}>{client.plot_number}</TableCell>
                  <TableCell className={cn("text-right text-xs px-2 hidden xl:table-cell", isCancelled && "text-red-600")}>{formatCurrency(client.total_price)}</TableCell>
                  <TableCell className={cn("text-right font-medium text-xs px-2", isCancelled ? "text-red-600" : "text-primary")}>
                    {formatCurrency(Number(client.total_paid) || 0)}
                  </TableCell>
                  <TableCell className={cn("text-right font-medium text-xs px-2", isCancelled && "text-red-600")}>
                    {Math.min(100, Math.max(0, Number(client.percent_paid) || 0)).toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-right text-xs px-2">
                    <Badge variant={isCancelled ? "destructive" : getBalanceStatus(client.balance, client.total_price) as any} className="text-[10px] px-1.5">
                      {formatCurrency(client.balance)}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn("text-xs px-2 hidden lg:table-cell truncate", isCancelled && "text-red-600")}>{client.sales_agent}</TableCell>
                  <TableCell className="text-center text-xs px-2 hidden xl:table-cell">
                    <Badge variant={isCancelled ? "destructive" : client.payment_type === 'cash' ? 'default' : 'secondary'} className="text-[10px] px-1">
                      {isCancelled ? 'Cancelled' : client.payment_type === 'cash' ? 'Full' : (client.installment_months ? `${client.installment_months}mo` : 'N/A')}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-1">
                    <div className="flex items-center justify-center gap-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewHistory(client)}
                        title="View Payment History"
                        className="hover:bg-blue-500/10 hover:text-blue-500 h-7 w-7"
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      {!isCancelled && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onAddPayment(client)}
                            title="Add Payment / Generate Receipt"
                            className="hover:bg-primary/10 hover:text-primary h-7 w-7"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(client)}
                            title="Edit Client"
                            className="hover:bg-secondary/10 hover:text-secondary h-7 w-7"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(client)}
                            title="Delete Client"
                            className="hover:bg-destructive/10 hover:text-destructive h-7 w-7"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filteredClients.length > 0 && (
        <div className="p-3 sm:p-4 border-t border-border text-xs sm:text-sm text-muted-foreground">
          Showing {filteredClients.length} of {clients.length} clients
        </div>
      )}
    </div>
  );
};

export default ClientTable;
