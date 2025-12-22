export interface Client {
  id: string;
  name: string;
  phone: string;
  projectName: string;
  plotNumber: string;
  totalPrice: number;
  discount: number;
  totalPaid: number;
  balance: number;
  salesAgent: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  clientId: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'M-Pesa' | 'Cheque';
  paymentDate: string;
  previousBalance: number;
  newBalance: number;
  receiptNumber: string;
  agentName: string;
  notes?: string;
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
