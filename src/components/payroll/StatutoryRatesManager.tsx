import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatKES } from '@/lib/kenyanPayrollCalculator';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Calculator, Percent, RefreshCw, Loader2 } from 'lucide-react';

interface StatutoryRate {
  id: string;
  rate_name: string;
  rate_type: string;
  rate_value: number;
  min_amount: number | null;
  max_amount: number | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean | null;
}

const RATE_TYPES = [
  { value: 'paye_band', label: 'PAYE Tax Band' },
  { value: 'nssf', label: 'NSSF Rate' },
  { value: 'sha', label: 'SHA Rate' },
  { value: 'housing_levy', label: 'Housing Levy' },
  { value: 'personal_relief', label: 'Personal Relief' },
  { value: 'insurance_relief', label: 'Insurance Relief' },
];

const StatutoryRatesManager = () => {
  const [rates, setRates] = useState<StatutoryRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<StatutoryRate | null>(null);
  const [activeTab, setActiveTab] = useState('paye_band');

  const [formData, setFormData] = useState({
    rate_name: '',
    rate_type: 'paye_band',
    rate_value: '',
    min_amount: '',
    max_amount: '',
    effective_from: new Date().toISOString().split('T')[0],
    is_active: true,
  });

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('statutory_rates')
        .select('*')
        .order('rate_type')
        .order('min_amount', { ascending: true, nullsFirst: true });

      if (error) throw error;
      setRates(data || []);
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast.error('Failed to fetch statutory rates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (rate?: StatutoryRate) => {
    if (rate) {
      setSelectedRate(rate);
      setFormData({
        rate_name: rate.rate_name,
        rate_type: rate.rate_type,
        rate_value: rate.rate_value.toString(),
        min_amount: rate.min_amount?.toString() || '',
        max_amount: rate.max_amount?.toString() || '',
        effective_from: rate.effective_from,
        is_active: rate.is_active ?? true,
      });
    } else {
      setSelectedRate(null);
      setFormData({
        rate_name: '',
        rate_type: activeTab,
        rate_value: '',
        min_amount: '',
        max_amount: '',
        effective_from: new Date().toISOString().split('T')[0],
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.rate_name || !formData.rate_value) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const rateData = {
        rate_name: formData.rate_name,
        rate_type: formData.rate_type,
        rate_value: parseFloat(formData.rate_value),
        min_amount: formData.min_amount ? parseFloat(formData.min_amount) : null,
        max_amount: formData.max_amount ? parseFloat(formData.max_amount) : null,
        effective_from: formData.effective_from,
        is_active: formData.is_active,
      };

      if (selectedRate) {
        const { error } = await supabase
          .from('statutory_rates')
          .update(rateData)
          .eq('id', selectedRate.id);

        if (error) throw error;
        toast.success('Rate updated successfully');
      } else {
        const { error } = await supabase
          .from('statutory_rates')
          .insert(rateData);

        if (error) throw error;
        toast.success('Rate added successfully');
      }

      setDialogOpen(false);
      fetchRates();
    } catch (error) {
      console.error('Error saving rate:', error);
      toast.error('Failed to save rate');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRate) return;

    try {
      const { error } = await supabase
        .from('statutory_rates')
        .delete()
        .eq('id', selectedRate.id);

      if (error) throw error;
      toast.success('Rate deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedRate(null);
      fetchRates();
    } catch (error) {
      console.error('Error deleting rate:', error);
      toast.error('Failed to delete rate');
    }
  };

  const toggleRateStatus = async (rate: StatutoryRate) => {
    try {
      const { error } = await supabase
        .from('statutory_rates')
        .update({ is_active: !rate.is_active })
        .eq('id', rate.id);

      if (error) throw error;
      toast.success(`Rate ${rate.is_active ? 'deactivated' : 'activated'}`);
      fetchRates();
    } catch (error) {
      console.error('Error toggling rate:', error);
      toast.error('Failed to update rate status');
    }
  };

  const getRatesByType = (type: string) => rates.filter(r => r.rate_type === type);

  const renderRatesTable = (rateType: string) => {
    const typeRates = getRatesByType(rateType);
    const isPAYE = rateType === 'paye_band';

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {typeRates.length} rate{typeRates.length !== 1 ? 's' : ''} configured
          </p>
          <Button onClick={() => handleOpenDialog()} size="sm" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Rate
          </Button>
        </div>

        {typeRates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No rates configured for this category. Click "Add Rate" to create one.
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {isPAYE && <TableHead className="text-right">Min (KES)</TableHead>}
                  {isPAYE && <TableHead className="text-right">Max (KES)</TableHead>}
                  <TableHead className="text-right">{isPAYE ? 'Rate (%)' : 'Value'}</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeRates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.rate_name}</TableCell>
                    {isPAYE && (
                      <TableCell className="text-right">
                        {rate.min_amount !== null ? formatKES(rate.min_amount) : '-'}
                      </TableCell>
                    )}
                    {isPAYE && (
                      <TableCell className="text-right">
                        {rate.max_amount !== null ? formatKES(rate.max_amount) : '∞'}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-mono">
                      {isPAYE ? `${rate.rate_value}%` : formatKES(rate.rate_value)}
                    </TableCell>
                    <TableCell>{format(new Date(rate.effective_from), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={rate.is_active ? 'default' : 'secondary'}>
                        {rate.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={rate.is_active ?? true}
                          onCheckedChange={() => toggleRateStatus(rate)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(rate)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedRate(rate);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Statutory Rates Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Manage PAYE tax bands, NSSF, SHA, and other statutory rates
          </p>
        </div>
        <Button onClick={fetchRates} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="paye_band" className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            PAYE Bands
          </TabsTrigger>
          <TabsTrigger value="nssf" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            NSSF
          </TabsTrigger>
          <TabsTrigger value="sha" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            SHA
          </TabsTrigger>
          <TabsTrigger value="housing_levy" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Housing Levy
          </TabsTrigger>
          <TabsTrigger value="personal_relief" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Reliefs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paye_band" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>PAYE Tax Bands</CardTitle>
              <CardDescription>
                Configure income tax bands according to KRA guidelines. Rates are applied progressively.
              </CardDescription>
            </CardHeader>
            <CardContent>{renderRatesTable('paye_band')}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nssf" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>NSSF Contribution Rates</CardTitle>
              <CardDescription>
                National Social Security Fund contribution rates for Tier I and Tier II.
              </CardDescription>
            </CardHeader>
            <CardContent>{renderRatesTable('nssf')}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sha" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>SHA Rates</CardTitle>
              <CardDescription>
                Social Health Authority contribution rates.
              </CardDescription>
            </CardHeader>
            <CardContent>{renderRatesTable('sha')}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="housing_levy" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Housing Levy</CardTitle>
              <CardDescription>
                Affordable Housing Levy rates for employee and employer contributions.
              </CardDescription>
            </CardHeader>
            <CardContent>{renderRatesTable('housing_levy')}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal_relief" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Reliefs</CardTitle>
              <CardDescription>
                Personal relief, insurance relief, and other tax reliefs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderRatesTable('personal_relief')}
              <div className="mt-6">
                <h4 className="font-medium mb-2">Insurance Relief</h4>
                {renderRatesTable('insurance_relief')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedRate ? 'Edit Rate' : 'Add New Rate'}</DialogTitle>
            <DialogDescription>
              {selectedRate ? 'Update the statutory rate details.' : 'Add a new statutory rate to the system.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rate_type">Rate Type</Label>
              <Select
                value={formData.rate_type}
                onValueChange={(value) => setFormData({ ...formData, rate_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate_name">Rate Name *</Label>
              <Input
                id="rate_name"
                value={formData.rate_name}
                onChange={(e) => setFormData({ ...formData, rate_name: e.target.value })}
                placeholder="e.g., Band 1, Tier I Employee"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate_value">
                {formData.rate_type === 'paye_band' ? 'Rate (%)' : 'Value (KES)'} *
              </Label>
              <Input
                id="rate_value"
                type="number"
                step="0.01"
                value={formData.rate_value}
                onChange={(e) => setFormData({ ...formData, rate_value: e.target.value })}
                placeholder={formData.rate_type === 'paye_band' ? 'e.g., 10' : 'e.g., 2400'}
              />
            </div>

            {formData.rate_type === 'paye_band' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_amount">Min Amount (KES)</Label>
                  <Input
                    id="min_amount"
                    type="number"
                    value={formData.min_amount}
                    onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_amount">Max Amount (KES)</Label>
                  <Input
                    id="max_amount"
                    type="number"
                    value={formData.max_amount}
                    onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                    placeholder="Leave empty for no limit"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="effective_from">Effective From *</Label>
              <Input
                id="effective_from"
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedRate ? 'Update' : 'Add'} Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRate?.rate_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StatutoryRatesManager;
