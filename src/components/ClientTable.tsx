import { useState } from 'react';
import { Client } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Edit2, Trash2, Receipt, UserPlus } from 'lucide-react';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onAddPayment: (client: Client) => void;
  onAddNew: () => void;
}

const ClientTable = ({ clients, onEdit, onDelete, onAddPayment, onAddNew }: ClientTableProps) => {
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
            <Button onClick={onAddNew} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Client
            </Button>
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
              <TableHead className="font-semibold text-right">Balance</TableHead>
              <TableHead className="font-semibold">Agent</TableHead>
              <TableHead className="font-semibold text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
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
