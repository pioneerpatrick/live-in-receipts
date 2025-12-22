import { Client, Payment } from '@/types/client';

const CLIENTS_KEY = 'livein_clients';
const PAYMENTS_KEY = 'livein_payments';

export const getClients = (): Client[] => {
  const data = localStorage.getItem(CLIENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveClients = (clients: Client[]): void => {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
};

export const addClient = (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Client => {
  const clients = getClients();
  const newClient: Client = {
    ...client,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  clients.push(newClient);
  saveClients(clients);
  return newClient;
};

export const updateClient = (id: string, updates: Partial<Client>): Client | null => {
  const clients = getClients();
  const index = clients.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  clients[index] = {
    ...clients[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveClients(clients);
  return clients[index];
};

export const deleteClient = (id: string): boolean => {
  const clients = getClients();
  const filtered = clients.filter(c => c.id !== id);
  if (filtered.length === clients.length) return false;
  saveClients(filtered);
  
  // Also delete associated payments
  const payments = getPayments().filter(p => p.clientId !== id);
  savePayments(payments);
  
  return true;
};

export const getPayments = (): Payment[] => {
  const data = localStorage.getItem(PAYMENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const savePayments = (payments: Payment[]): void => {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
};

export const addPayment = (payment: Omit<Payment, 'id'>): Payment => {
  const payments = getPayments();
  const newPayment: Payment = {
    ...payment,
    id: crypto.randomUUID(),
  };
  payments.push(newPayment);
  savePayments(payments);
  return newPayment;
};

export const getClientPayments = (clientId: string): Payment[] => {
  return getPayments().filter(p => p.clientId === clientId);
};

export const generateReceiptNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LIP-${year}${month}-${random}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
