import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface BulkPlotFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { prefix: string; startNumber: number; count: number; size: string; price: number }) => void;
  isLoading?: boolean;
}

export function BulkPlotForm({ open, onOpenChange, onSubmit, isLoading }: BulkPlotFormProps) {
  const [prefix, setPrefix] = useState('');
  const [startNumber, setStartNumber] = useState('1');
  const [count, setCount] = useState('10');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      prefix,
      startNumber: parseInt(startNumber) || 1,
      count: parseInt(count) || 1,
      size,
      price: parseFloat(price) || 0
    });
    setPrefix('');
    setStartNumber('1');
    setCount('10');
    setSize('');
    setPrice('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Add Plots</DialogTitle>
          <DialogDescription>
            Quickly add multiple plots with sequential numbering
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prefix">Plot Prefix</Label>
                <Input
                  id="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g., A-"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startNumber">Start Number</Label>
                <Input
                  id="startNumber"
                  type="number"
                  value={startNumber}
                  onChange={(e) => setStartNumber(e.target.value)}
                  min="1"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="count">Number of Plots *</Label>
              <Input
                id="count"
                type="number"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="e.g., 50"
                required
                min="1"
                max="500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="size">Size (all plots) *</Label>
              <Input
                id="size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g., 50x100 ft"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price per Plot (KES) *</Label>
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
            <p className="text-sm text-muted-foreground">
              This will create plots: {prefix}{startNumber} to {prefix}{parseInt(startNumber || '1') + parseInt(count || '0') - 1}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : `Create ${count} Plots`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
