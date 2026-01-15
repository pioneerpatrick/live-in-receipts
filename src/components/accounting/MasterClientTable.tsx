import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Client } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { Printer, Search, Users, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface MasterClientTableProps {
  clients: Client[];
}

export const MasterClientTable = ({ clients }: MasterClientTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.plot_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.phone && client.phone.includes(searchTerm));
      
      const matchesStatus = 
        statusFilter === 'all' || 
        client.status === statusFilter ||
        (statusFilter === 'active' && (client.status === 'ongoing' || client.status === 'completed'));
      
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const getStatusBadge = (status: string | null, balance: number) => {
    if (status === 'cancelled') {
      return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
    }
    if (balance === 0 || status === 'completed') {
      return <Badge className="bg-green-500/20 text-green-700 border-green-300 text-xs">Completed</Badge>;
    }
    return <Badge className="bg-blue-500/20 text-blue-700 border-blue-300 text-xs">Ongoing</Badge>;
  };

  const handlePrint = () => {
    const printContent = document.getElementById('master-client-table');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #f4f4f4; font-weight: bold; }
        .status-completed { color: green; }
        .status-ongoing { color: blue; }
        .status-cancelled { color: red; }
        .text-right { text-align: right; }
        @media print {
          @page { size: landscape; margin: 10mm; }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Master Client Database - Live-In Properties</title>
          ${styles}
        </head>
        <body>
          <h1>Master Client Database</h1>
          <p>Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p>Total Clients: ${filteredClients.length}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Client Name</th>
                <th>Phone</th>
                <th>Project</th>
                <th>Plot</th>
                <th>Total Price</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>% Paid</th>
                <th>Status</th>
                <th>Agent</th>
              </tr>
            </thead>
            <tbody>
              ${filteredClients.map((client, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${client.name}</td>
                  <td>${client.phone || '-'}</td>
                  <td>${client.project_name}</td>
                  <td>${client.plot_number}</td>
                  <td class="text-right">${formatCurrency(client.total_price - client.discount)}</td>
                  <td class="text-right">${formatCurrency(client.total_paid)}</td>
                  <td class="text-right">${formatCurrency(client.balance)}</td>
                  <td class="text-right">${(client.percent_paid ?? 0).toFixed(1)}%</td>
                  <td class="${
                    client.status === 'cancelled' ? 'status-cancelled' :
                    client.balance === 0 ? 'status-completed' : 'status-ongoing'
                  }">${
                    client.status === 'cancelled' ? 'Cancelled' :
                    client.balance === 0 ? 'Completed' : 'Ongoing'
                  }</td>
                  <td>${client.sales_agent || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const summary = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status !== 'cancelled').length;
    const completed = clients.filter(c => c.status === 'completed' || (c.status !== 'cancelled' && c.balance === 0)).length;
    const ongoing = clients.filter(c => c.status === 'ongoing' && c.balance > 0).length;
    const cancelled = clients.filter(c => c.status === 'cancelled').length;

    return { total, active, completed, ongoing, cancelled };
  }, [clients]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Master Client Database
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-sm">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-lg font-bold">{summary.total}</p>
            <p className="text-xs text-muted-foreground">Total Clients</p>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-2">
            <p className="text-lg font-bold text-blue-600">{summary.ongoing}</p>
            <p className="text-xs text-muted-foreground">Ongoing</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2">
            <p className="text-lg font-bold text-green-600">{summary.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="bg-red-500/10 rounded-lg p-2">
            <p className="text-lg font-bold text-red-600">{summary.cancelled}</p>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </div>
          <div className="bg-primary/10 rounded-lg p-2">
            <p className="text-lg font-bold text-primary">{summary.active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, project, plot..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <ScrollArea className="h-[500px]">
          <div id="master-client-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project / Plot</TableHead>
                  <TableHead className="text-right">Total Price</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">% Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No clients found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client, index) => (
                    <TableRow key={client.id} className={client.status === 'cancelled' ? 'opacity-60' : ''}>
                      <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.phone || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{client.project_name}</p>
                          <p className="text-xs text-muted-foreground">Plot: {client.plot_number}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatCurrency(client.total_price - client.discount)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-green-600">
                        {formatCurrency(client.total_paid)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-amber-600">
                        {formatCurrency(client.balance)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {(client.percent_paid ?? 0).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(client.status, client.balance)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {client.sales_agent || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
        
        <div className="text-xs text-muted-foreground text-center">
          Showing {filteredClients.length} of {clients.length} clients
        </div>
      </CardContent>
    </Card>
  );
};
