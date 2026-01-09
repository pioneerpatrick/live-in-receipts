import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { toast } from 'sonner';

interface Plot {
  id: string;
  plot_number: string;
  size: string;
  price: number;
  status: string;
  project_id: string;
  client_id: string | null;
  client?: { name: string; phone: string | null } | null;
}

interface AvailablePlotsDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  projectName: string;
  statusFilter: 'available' | 'sold' | 'reserved' | 'all';
  isAdmin: boolean;
  onPlotReturned?: () => void;
}

export function AvailablePlotsDialog({ 
  open, 
  onClose, 
  projectId, 
  projectName, 
  statusFilter,
  isAdmin,
  onPlotReturned 
}: AvailablePlotsDialogProps) {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(false);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      fetchPlots();
    }
  }, [open, projectId, statusFilter]);

  const fetchPlots = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('plots')
        .select(`
          id,
          plot_number,
          size,
          price,
          status,
          project_id,
          client_id
        `)
        .eq('project_id', projectId)
        .order('plot_number');

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Fetch client names for sold/reserved plots
      const plotsWithClients = await Promise.all(
        (data || []).map(async (plot) => {
          if (plot.client_id) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('name, phone')
              .eq('id', plot.client_id)
              .single();
            return { ...plot, client: clientData };
          }
          return { ...plot, client: null };
        })
      );

      setPlots(plotsWithClients);
    } catch (error) {
      console.error('Error fetching plots:', error);
      toast.error('Failed to load plots');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnPlot = async () => {
    if (!returnId) return;
    setReturning(true);
    try {
      const { error } = await supabase
        .from('plots')
        .update({ status: 'available', client_id: null, sold_at: null })
        .eq('id', returnId);

      if (error) throw error;

      toast.success('Plot returned to available status');
      setReturnId(null);
      fetchPlots();
      onPlotReturned?.();
    } catch (error) {
      console.error('Error returning plot:', error);
      toast.error('Failed to return plot');
    } finally {
      setReturning(false);
    }
  };

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

  const getDialogTitle = () => {
    switch (statusFilter) {
      case 'available': return `Available Plots - ${projectName}`;
      case 'sold': return `Sold Plots - ${projectName}`;
      case 'reserved': return `Reserved Plots - ${projectName}`;
      default: return `All Plots - ${projectName}`;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : plots.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No {statusFilter !== 'all' ? statusFilter : ''} plots found in this project.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plot Number</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    {(statusFilter === 'sold' || statusFilter === 'reserved' || statusFilter === 'all') && (
                      <TableHead>Client</TableHead>
                    )}
                    {isAdmin && (statusFilter === 'sold' || statusFilter === 'reserved' || statusFilter === 'all') && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plots.map((plot) => (
                    <TableRow key={plot.id}>
                      <TableCell className="font-medium">{plot.plot_number}</TableCell>
                      <TableCell>{plot.size}</TableCell>
                      <TableCell>{formatCurrency(plot.price)}</TableCell>
                      <TableCell>{getStatusBadge(plot.status)}</TableCell>
                      {(statusFilter === 'sold' || statusFilter === 'reserved' || statusFilter === 'all') && (
                        <TableCell>
                          {plot.client ? (
                            <div>
                              <p className="font-medium text-sm">{plot.client.name}</p>
                              {plot.client.phone && (
                                <p className="text-xs text-muted-foreground">{plot.client.phone}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      {isAdmin && (statusFilter === 'sold' || statusFilter === 'reserved' || statusFilter === 'all') && (
                        <TableCell className="text-right">
                          {(plot.status === 'sold' || plot.status === 'reserved') && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setReturnId(plot.id)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Return
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          <div className="text-sm text-muted-foreground pt-2 border-t">
            Total: {plots.length} plot{plots.length !== 1 ? 's' : ''}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!returnId}
        onOpenChange={() => setReturnId(null)}
        onConfirm={handleReturnPlot}
        title="Return Plot to Stock"
        description="Are you sure you want to return this plot to available status? This will remove the client association but will NOT delete the client record or their payments."
        confirmText={returning ? "Returning..." : "Return Plot"}
        variant="default"
      />
    </>
  );
}
