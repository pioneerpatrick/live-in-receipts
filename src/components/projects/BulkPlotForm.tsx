import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface BulkPlotFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { plotNumbers: string[]; size: string; price: number }) => void;
  isLoading?: boolean;
}

export function BulkPlotForm({ open, onOpenChange, onSubmit, isLoading }: BulkPlotFormProps) {
  const [plotNumbersText, setPlotNumbersText] = useState('');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');

  // Parse plot numbers from text (comma, newline, or space separated)
  const parsePlotNumbers = (text: string): string[] => {
    return text
      .split(/[,\n\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  const plotNumbers = parsePlotNumbers(plotNumbersText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (plotNumbers.length === 0) return;
    
    onSubmit({
      plotNumbers,
      size,
      price: parseFloat(price) || 0
    });
    setPlotNumbersText('');
    setSize('');
    setPrice('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Add Plots</DialogTitle>
          <DialogDescription>
            Add multiple plots with the same size and price
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="plotNumbers">Plot Numbers *</Label>
              <Textarea
                id="plotNumbers"
                value={plotNumbersText}
                onChange={(e) => setPlotNumbersText(e.target.value)}
                placeholder="Enter plot numbers separated by comma, space, or new line&#10;&#10;Examples:&#10;A, B, C, D, E&#10;1, 2, 3, 4, 5&#10;P001 P002 P003"
                rows={5}
                required
              />
              <p className="text-xs text-muted-foreground">
                {plotNumbers.length > 0 ? (
                  <>
                    <span className="font-medium text-primary">{plotNumbers.length}</span> plots will be created: {plotNumbers.slice(0, 5).join(', ')}
                    {plotNumbers.length > 5 && ` and ${plotNumbers.length - 5} more...`}
                  </>
                ) : (
                  'Enter plot numbers separated by comma, space, or new line'
                )}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="size">Size (all plots) *</Label>
              <Input
                id="size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g., 50x100 ft or 1/8 acre"
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || plotNumbers.length === 0}>
              {isLoading ? 'Creating...' : `Create ${plotNumbers.length} Plot${plotNumbers.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
