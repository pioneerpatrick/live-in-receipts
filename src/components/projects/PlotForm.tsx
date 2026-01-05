import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plot } from '@/types/project';

interface PlotFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Plot, 'id' | 'created_at' | 'updated_at' | 'project' | 'client'>) => void;
  projectId: string;
  initialData?: Plot;
  isLoading?: boolean;
}

export function PlotForm({ open, onOpenChange, onSubmit, projectId, initialData, isLoading }: PlotFormProps) {
  const [plotNumber, setPlotNumber] = useState(initialData?.plot_number || '');
  const [size, setSize] = useState(initialData?.size || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [status, setStatus] = useState<'available' | 'sold' | 'reserved'>(initialData?.status || 'available');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      project_id: projectId,
      plot_number: plotNumber,
      size,
      price: parseFloat(price) || 0,
      status,
      notes: notes || undefined
    });
    if (!initialData) {
      setPlotNumber('');
      setSize('');
      setPrice('');
      setStatus('available');
      setNotes('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Plot' : 'Add New Plot'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="plotNumber">Plot Number *</Label>
              <Input
                id="plotNumber"
                value={plotNumber}
                onChange={(e) => setPlotNumber(e.target.value)}
                placeholder="e.g., A-001"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="size">Size *</Label>
              <Input
                id="size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g., 50x100 ft or 1/8 acre"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price (KES) *</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., 500000"
                required
                min="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'available' | 'sold' | 'reserved')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : initialData ? 'Update' : 'Add Plot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
