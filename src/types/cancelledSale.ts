export type CancelledSaleOutcome = 'pending' | 'transferred' | 'refunded' | 'retained' | 'partial_refund';

export interface CancelledSale {
  id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  project_name: string;
  plot_number: string;
  original_sale_date: string | null;
  cancellation_date: string;
  total_price: number;
  total_paid: number;
  refund_amount: number;
  refund_status: 'pending' | 'partial' | 'completed' | 'none';
  cancellation_fee: number;
  net_refund: number;
  cancellation_reason: string | null;
  notes: string | null;
  cancelled_by: string | null;
  // New audit fields
  outcome_type: CancelledSaleOutcome;
  transferred_to_client_id: string | null;
  transferred_to_project: string | null;
  transferred_to_plot: string | null;
  audit_notes: string | null;
  income_retained: number;
  expense_recorded: number;
  processed_date: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CancelledSaleAuditEntry {
  date: string;
  action: string;
  description: string;
  amount?: number;
  type: 'income' | 'expense' | 'transfer' | 'info';
}
