import { useState } from 'react';
import { Client } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Edit2, Trash2, Receipt, UserPlus, Download, Printer, History, Upload } from 'lucide-react';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onAddPayment: (client: Client) => void;
  onViewHistory: (client: Client) => void;
  onAddNew: () => void;
  onImportExcel: () => void;
}

const ClientTable = ({ clients, onEdit, onDelete, onAddPayment, onViewHistory, onAddNew, onImportExcel }: ClientTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.plot_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.project_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBalanceStatus = (balance: number, totalPrice: number) => {
    if (balance === 0) return 'success';
    if (balance < totalPrice * 0.5) return 'warning';
    return 'default';
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
    <div className="bg-card rounded-lg card-shadow animate-fade-in">
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Client & Payment Database
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={onImportExcel} title="Import from Excel">
                <Upload className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleExportCSV} title="Export to CSV">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrint} title="Print Table">
                <Printer className="w-4 h-4" />
              </Button>
              <Button onClick={onAddNew} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add Client
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">#</TableHead>
              <TableHead className="font-semibold">Client Name</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Project</TableHead>
              <TableHead className="font-semibold">Plot No.</TableHead>
              <TableHead className="font-semibold text-right">Total Price</TableHead>
              <TableHead className="font-semibold text-right">Discount</TableHead>
              <TableHead className="font-semibold text-right">Total Paid</TableHead>
              <TableHead className="font-semibold text-right">% Paid</TableHead>
              <TableHead className="font-semibold text-right">Balance</TableHead>
              <TableHead className="font-semibold">Agent</TableHead>
              <TableHead className="font-semibold text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                  {searchTerm ? 'No clients found matching your search.' : 'No clients yet. Add your first client to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client, index) => (
                <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>{client.project_name}</TableCell>
                  <TableCell>{client.plot_number}</TableCell>
                  <TableCell className="text-right">{formatCurrency(client.total_price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(client.discount)}</TableCell>
                  <TableCell className="text-right text-primary font-medium">
                    {formatCurrency(client.total_paid)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {(client.percent_paid ?? 0).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getBalanceStatus(client.balance, client.total_price) as any}>
                      {formatCurrency(client.balance)}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.sales_agent}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewHistory(client)}
                        title="View Payment History"
                        className="hover:bg-blue-500/10 hover:text-blue-500"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onAddPayment(client)}
                        title="Add Payment / Generate Receipt"
                        className="hover:bg-primary/10 hover:text-primary"
                      >
                        <Receipt className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(client)}
                        title="Edit Client"
                        className="hover:bg-secondary/10 hover:text-secondary"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(client)}
                        title="Delete Client"
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filteredClients.length > 0 && (
        <div className="p-4 border-t border-border text-sm text-muted-foreground">
          Showing {filteredClients.length} of {clients.length} clients
        </div>
      )}
    </div>
  );
};

export default ClientTable;
