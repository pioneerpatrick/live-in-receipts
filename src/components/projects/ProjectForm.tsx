import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Project } from '@/types/project';

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { 
    name: string; 
    location: string; 
    description: string | null; 
    capacity: number;
    plotNumbers?: string[];
    plotSize?: string;
    plotPrice?: number;
  }) => void;
  initialData?: Project;
  isLoading?: boolean;
}

// Parse plot numbers from text (comma, newline, or space separated)
const parsePlotNumbers = (text: string): string[] => {
  return text
    .split(/[,\n\s]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
};

export function ProjectForm({ open, onOpenChange, onSubmit, initialData, isLoading }: ProjectFormProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [plotNumbersText, setPlotNumbersText] = useState('');
  const [plotSize, setPlotSize] = useState('');
  const [plotPrice, setPlotPrice] = useState('');
  const [description, setDescription] = useState('');

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setLocation(initialData?.location || '');
      setDescription(initialData?.description || '');
      setPlotNumbersText('');
      setPlotSize('');
      setPlotPrice('');
    }
  }, [open, initialData]);

  const plotNumbers = parsePlotNumbers(plotNumbersText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!initialData && plotNumbers.length === 0) {
      return;
    }

    onSubmit({ 
      name, 
      location, 
      capacity: initialData ? initialData.capacity : plotNumbers.length,
      description: description || null,
      plotNumbers: initialData ? undefined : plotNumbers,
      plotSize: initialData ? undefined : plotSize,
      plotPrice: initialData ? undefined : (parseFloat(plotPrice) || 0)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          {!initialData && (
            <DialogDescription>
              Enter project details and list all plot numbers
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Leshaoo Gardens Phase 2"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Kitengela, Kajiado"
                required
              />
            </div>
            {!initialData && (
              <div className="grid gap-2">
                <Label htmlFor="plotNumbers">Plot Numbers *</Label>
                <Textarea
                  id="plotNumbers"
                  value={plotNumbersText}
                  onChange={(e) => setPlotNumbersText(e.target.value)}
                  placeholder="Enter plot numbers separated by comma, space, or new line&#10;&#10;Examples:&#10;1, 2, 3, 4, 5&#10;A1, A2, A3, A4&#10;P001 P002 P003"
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
                    'Enter all plot numbers for this project'
                  )}
                </p>
              </div>
            )}
            {!initialData && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="plotSize">Plot Size *</Label>
                  <Input
                    id="plotSize"
                    value={plotSize}
                    onChange={(e) => setPlotSize(e.target.value)}
                    placeholder="e.g., 50x100 ft"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plotPrice">Price per Plot (KES) *</Label>
                  <Input
                    id="plotPrice"
                    type="number"
                    value={plotPrice}
                    onChange={(e) => setPlotPrice(e.target.value)}
                    placeholder="e.g., 500000"
                    required
                    min="0"
                  />
                </div>
              </div>
            )}
            {initialData && (
              <div className="grid gap-2">
                <Label>Total Plots</Label>
                <p className="text-sm text-muted-foreground">
                  {initialData.total_plots} of {initialData.capacity} plots. 
                  Use "Add Plot" or "Bulk Add" to manage plots.
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (!initialData && plotNumbers.length === 0)}>
              {isLoading ? 'Saving...' : initialData ? 'Update' : `Create with ${plotNumbers.length} Plots`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
