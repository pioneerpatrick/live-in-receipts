import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Client, Payment } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { BookOpen, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format } from 'date-fns';

interface GeneralLedgerProps {
  clients: Client[];
  payments: Payment[];
}

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  category: string;
  reference: string;
}

export const GeneralLedger = ({ clients, payments }: GeneralLedgerProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Create a client lookup map
  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);

  // Build ledger entries from payments
  const ledgerEntries = useMemo(() => {
    let runningBalance = 0;
    
    const entries: LedgerEntry[] = payments
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
      .map(payment => {
        const client = clientMap.get(payment.client_id);
        runningBalance += payment.amount;
        
        return {
          id: payment.id,
          date: payment.payment_date,
          description: `Payment from ${client?.name || 'Unknown'} - ${client?.project_name || 'Unknown Project'}`,
          type: 'credit' as const,
          amount: payment.amount,
          balance: runningBalance,
          category: 'Revenue',
          reference: payment.receipt_number,
        };
      });

    return entries.reverse(); // Most recent first
  }, [payments, clientMap]);

  // Filter entries based on search
  const filteredEntries = useMemo(() => {
    if (!searchTerm) return ledgerEntries;
    
    const lower = searchTerm.toLowerCase();
    return ledgerEntries.filter(entry => 
      entry.description.toLowerCase().includes(lower) ||
      entry.reference.toLowerCase().includes(lower) ||
      entry.category.toLowerCase().includes(lower)
    );
  }, [ledgerEntries, searchTerm]);

  // Calculate totals
  const totals = useMemo(() => {
    return {
      totalCredits: ledgerEntries.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0),
      totalDebits: ledgerEntries.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0),
      entryCount: ledgerEntries.length,
    };
  }, [ledgerEntries]);

  return (
    <div className="space-y-6">
      {/* Ledger Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalCredits)}</p>
              </div>
              <ArrowUpRight className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Debits</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.totalDebits)}</p>
              </div>
              <ArrowDownRight className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totals.totalCredits - totals.totalDebits)}</p>
              </div>
              <BookOpen className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              General Ledger ({totals.entryCount} entries)
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.slice(0, 100).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(entry.date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{entry.reference}</code>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={entry.description}>
                      {entry.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entry.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {entry.type === 'debit' ? formatCurrency(entry.amount) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {entry.type === 'credit' ? formatCurrency(entry.amount) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(entry.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'No entries match your search' : 'No ledger entries available'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filteredEntries.length > 100 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Showing 100 of {filteredEntries.length} entries
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
