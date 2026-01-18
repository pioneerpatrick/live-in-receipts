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
  payment_type: string; // 'installments' or 'cash'
  payment_period: string;
  installment_months: number | null;
  initial_payment_method: string;
  completion_date: string | null;
  next_payment_date: string | null;
  notes: string;
  status: string;
  sale_date: string | null;
  commission: number | null;
  commission_received: number | null;
  commission_balance: number | null;
  tenant_id?: string;
  created_by?: string;
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
  reference_number?: string;
  tenant_id?: string;
  created_by?: string;
  created_at: string;
}

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  clientId: string;
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
  paymentType?: string;
  referenceNumber?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'staff';
  tenant_id?: string;
}

// Tenant types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  status: 'active' | 'suspended' | 'pending';
  subscription_plan: string;
  max_users: number;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  is_tenant_admin: boolean;
  created_at: string;
}
