// Database types (snake_case to match Supabase schema)
export interface Client {
  id: string;
  name: string;
  phone: string;
  project_name: string;
  plot_number: string;
  unit_price: number;
  number_of_plots: number;
  total_price: number;
  discount: number;
  total_paid: number;
  percent_paid: number;
  balance: number;
  sales_agent: string;
  commission: number;
  commission_received: number;
  commission_balance: number;
  payment_period: string;
  completion_date: string | null;
  next_payment_date: string | null;
  notes: string;
  status: string;
  sale_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  client_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  previous_balance: number;
  new_balance: number;
  receipt_number: string;
  agent_name: string;
  authorized_by?: string;
  notes?: string;
  created_at: string;
}

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  clientName: string;
  clientPhone: string;
  projectName: string;
  plotNumber: string;
  totalPrice: number;
  discount: number;
  discountedPrice: number;
  currentPayment: number;
  paymentMethod: string;
  previousBalance: number;
  remainingBalance: number;
  totalPaid: number;
  agentName: string;
  authorizedBy?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'staff';
}
