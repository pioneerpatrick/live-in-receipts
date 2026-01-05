import { supabase } from '@/integrations/supabase/client';
import { ParsedClientData } from './excelDataParser';
import { generateReceiptNumber } from './supabaseStorage';

export interface ImportResult {
  clientsImported: number;
  paymentsImported: number;
  errors: string[];
}

export const bulkImportWithPayments = async (
  data: ParsedClientData[]
): Promise<ImportResult> => {
  const result: ImportResult = {
    clientsImported: 0,
    paymentsImported: 0,
    errors: []
  };

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  for (const item of data) {
    try {
      // Insert client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: item.client.name,
          phone: item.client.phone || null,
          project_name: item.client.project_name,
          plot_number: item.client.plot_number,
          unit_price: item.client.unit_price,
          number_of_plots: item.client.number_of_plots,
          total_price: item.client.total_price,
          discount: item.client.discount,
          total_paid: item.client.total_paid,
          balance: item.client.balance,
          sales_agent: item.client.sales_agent || null,
          payment_type: item.client.payment_type,
          payment_period: item.client.payment_period || null,
          installment_months: item.client.installment_months,
          initial_payment_method: item.client.initial_payment_method,
          completion_date: item.client.completion_date,
          next_payment_date: item.client.next_payment_date,
          notes: item.client.notes || null,
          status: item.client.status,
          sale_date: item.client.sale_date,
        })
        .select()
        .single();

      if (clientError) {
        result.errors.push(`Failed to import client "${item.client.name}": ${clientError.message}`);
        continue;
      }

      result.clientsImported++;

      // Insert payments for this client
      if (item.payments.length > 0 && clientData) {
        let runningBalance = item.client.total_price;
        
        for (const payment of item.payments) {
          const previousBalance = runningBalance;
          runningBalance = Math.max(0, runningBalance - payment.amount);
          
          const { error: paymentError } = await supabase
            .from('payments')
            .insert({
              client_id: clientData.id,
              amount: payment.amount,
              payment_method: 'Cash',
              payment_date: payment.payment_date || new Date().toISOString(),
              previous_balance: previousBalance,
              new_balance: runningBalance,
              receipt_number: generateReceiptNumber(),
              agent_name: item.client.sales_agent || null,
              authorized_by: null,
              notes: payment.notes || 'Imported from Excel',
              created_by: user?.id,
            });

          if (paymentError) {
            result.errors.push(`Failed to import payment for "${item.client.name}": ${paymentError.message}`);
          } else {
            result.paymentsImported++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Error processing "${item.client.name}": ${String(error)}`);
    }
  }

  return result;
};
