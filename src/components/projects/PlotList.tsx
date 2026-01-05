import { useState } from 'react';
import { Plot } from '@/types/project';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, RotateCcw, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/supabaseStorage';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface PlotListProps {
  plots: Plot[];
  onEdit: (plot: Plot) => void;
  onDelete: (id: string) => void;
  onReturn: (id: string) => void;
  isLoading?: boolean;
}

export function PlotList({ plots, onEdit, onDelete, onReturn, isLoading }: PlotListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [returnId, setReturnId] = useState<string | null>(null);

  const filteredPlots = plots.filter(plot => {
    const matchesSearch = plot.plot_number.toLowerCase().includes(search.toLowerCase()) ||
      plot.client?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || plot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Available</Badge>;
      case 'sold':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Sold</Badge>;
      case 'reserved':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Reserved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plots or client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plot Number</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isLoading ? 'Loading plots...' : 'No plots found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPlots.map((plot) => (
                <TableRow key={plot.id}>
                  <TableCell className="font-medium">{plot.plot_number}</TableCell>
                  <TableCell>{plot.size}</TableCell>
                  <TableCell>{formatCurrency(plot.price)}</TableCell>
                  <TableCell>{getStatusBadge(plot.status)}</TableCell>
                  <TableCell>
                    {plot.client ? (
                      <div>
                        <p className="font-medium">{plot.client.name}</p>
                        {plot.client.phone && (
                          <p className="text-sm text-muted-foreground">{plot.client.phone}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(plot)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {plot.status === 'sold' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setReturnId(plot.id)}
                          title="Return plot (client defaulted)"
                        >
                          <RotateCcw className="h-4 w-4 text-orange-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(plot.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) onDelete(deleteId);
          setDeleteId(null);
        }}
        title="Delete Plot"
        description="Are you sure you want to delete this plot? This action cannot be undone."
        confirmText="Delete"
      />

      <ConfirmDialog
        open={!!returnId}
        onOpenChange={() => setReturnId(null)}
        onConfirm={() => {
          if (returnId) onReturn(returnId);
          setReturnId(null);
        }}
        title="Return Plot"
        description="Are you sure you want to return this plot to available status? This will remove the client association."
        confirmText="Return Plot"
        variant="default"
      />
    </div>
  );
}
