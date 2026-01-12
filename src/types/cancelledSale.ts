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
  created_at: string;
  updated_at: string;
}
