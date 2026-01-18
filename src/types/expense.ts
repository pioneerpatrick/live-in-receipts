export interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  recipient: string | null;
  reference_number: string | null;
  agent_id: string | null;
  client_id: string | null;
  is_commission_payout: boolean;
  notes: string | null;
  tenant_id?: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const EXPENSE_CATEGORIES = [
  'Commission Payout',
  'Office Supplies',
  'Utilities',
  'Rent',
  'Marketing',
  'Transport',
  'Salaries',
  'Legal Fees',
  'Maintenance',
  'Refund',
  'Other',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
