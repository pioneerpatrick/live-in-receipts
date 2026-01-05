import { Client, Payment } from '@/types/client';

export interface ParsedClientData {
  client: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'percent_paid'>;
  payments: Array<{
    amount: number;
    payment_date: string | null;
    notes: string;
  }>;
}

// Parse amount from text like "200k", "1M", "100,000", etc.
export const parseAmount = (text: string): number => {
  if (!text) return 0;
  const cleaned = text.toString().toLowerCase().trim()
    .replace(/[,\s]/g, '')
    .replace(/kes/gi, '')
    .replace(/ksh/gi, '');
  
  // Handle "k" for thousands
  if (cleaned.includes('k')) {
    const num = parseFloat(cleaned.replace('k', ''));
    return isNaN(num) ? 0 : num * 1000;
  }
  
  // Handle "m" for millions
  if (cleaned.includes('m')) {
    const num = parseFloat(cleaned.replace('m', ''));
    return isNaN(num) ? 0 : num * 1000000;
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Parse date from various formats
export const parsePaymentDate = (text: string): string | null => {
  if (!text) return null;
  
  const dateStr = text.toString().trim();
  
  // Extract date patterns from the payment string
  // Common patterns: "6/6/2024", "26/7/2024", "7/9/2024", "22nd/9/2024", etc.
  
  // Try to find day/month/year pattern
  const patterns = [
    // "6/6/2024", "26/7/2024"
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // "6th/6/2024", "22nd/9/2024"
    /(\d{1,2})(?:st|nd|rd|th)?\/(\d{1,2})\/(\d{4})/i,
    // "6th May 2025", "22nd Nov 2025"
    /(\d{1,2})(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})?/i,
    // "May 2025" - use 1st of month
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})$/i,
  ];
  
  const monthMap: Record<string, number> = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
  };
  
  // Try pattern 1: d/m/yyyy
  let match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try pattern 2: day with suffix + month name + year
  match = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?[\s\/]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\/]*(\d{4})?/i);
  if (match) {
    const [, day, monthName, year] = match;
    const month = monthMap[monthName.toLowerCase().substring(0, 3)];
    const finalYear = year || '2025'; // Default to 2025 if no year
    return `${finalYear}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try extracting just numbers if format is like "30th/12/2024"
  match = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\/(\d{1,2})\/(\d{4})/i);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
};

// Extract phone from name string like "Benson Ondimu: 0729630901"
export const extractPhone = (nameStr: string): { name: string; phone: string } => {
  if (!nameStr) return { name: '', phone: '' };
  
  // Try different patterns
  // Pattern: "Name: Phone"
  const colonMatch = nameStr.match(/^(.+?):\s*(\+?\d[\d\s-]+)$/);
  if (colonMatch) {
    return { 
      name: colonMatch[1].trim(), 
      phone: colonMatch[2].replace(/[\s-]/g, '').trim() 
    };
  }
  
  // Pattern: "Name Phone" where phone starts with 0 or +
  const spaceMatch = nameStr.match(/^(.+?)\s+(\+?\d{10,})$/);
  if (spaceMatch) {
    return { 
      name: spaceMatch[1].trim(), 
      phone: spaceMatch[2].trim() 
    };
  }
  
  // Pattern: Phone embedded in name with special chars
  const phoneMatch = nameStr.match(/(\+?\d{10,15})/);
  if (phoneMatch) {
    const phone = phoneMatch[1];
    const name = nameStr.replace(phone, '').replace(/[:\s]+$/, '').trim();
    return { name, phone };
  }
  
  return { name: nameStr.trim(), phone: '' };
};

// Parse number of plots from strings like "Two: 1&2", "One: 16", "Three. 9,10,11"
export const parsePlotsInfo = (plotStr: string): { count: number; numbers: string } => {
  if (!plotStr) return { count: 1, numbers: '' };
  
  const str = plotStr.toString().trim();
  
  // Word to number mapping
  const wordToNum: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
  };
  
  // Try to extract count from word
  const wordMatch = str.toLowerCase().match(/^(one|two|three|four|five|six|seven|eight|nine|ten)/);
  let count = 1;
  if (wordMatch) {
    count = wordToNum[wordMatch[1]] || 1;
  }
  
  // Extract plot numbers
  const numbersMatch = str.match(/[\d,&\s-]+$/);
  const numbers = numbersMatch ? numbersMatch[0].trim() : str;
  
  return { count, numbers };
};

// Parse status from various formats
export const parseStatus = (status: string): string => {
  if (!status) return 'ongoing';
  const lower = status.toLowerCase().trim();
  
  if (lower.includes('complete')) return 'completed';
  if (lower.includes('cancel')) return 'cancelled';
  if (lower.includes('refund')) return 'refunded';
  if (lower.includes('ongoing')) return 'ongoing';
  
  return 'ongoing';
};

// Parse balance amount
export const parseBalance = (balanceStr: string): number => {
  if (!balanceStr) return 0;
  return parseAmount(balanceStr.toString().replace(/[^\d,.km]/gi, ''));
};

// Parse payment entry from payment date column
export const parsePaymentEntry = (paymentStr: string): { amount: number; date: string | null } | null => {
  if (!paymentStr) return null;
  
  const str = paymentStr.toString().trim();
  if (!str) return null;
  
  // Pattern: "200k on 6/6/2024" or "100,000: 7/9/2024" or "150,000 : 5th/12/2024"
  // First extract the amount
  const amountMatch = str.match(/^([\d,.]+[km]?)/i);
  if (!amountMatch) return null;
  
  const amount = parseAmount(amountMatch[1]);
  if (amount <= 0) return null;
  
  // Then extract the date
  const date = parsePaymentDate(str);
  
  return { amount, date };
};

// Main parser for the Excel data structure
export const parseExcelData = (rows: any[][]): ParsedClientData[] => {
  const results: ParsedClientData[] = [];
  let currentClient: ParsedClientData | null = null;
  let currentProject = '';
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    // Skip header rows
    const firstCell = (row[0] || '').toString().toLowerCase().trim();
    if (firstCell === 'client name' || firstCell.includes('cleared') || 
        firstCell.includes('ongoing') || firstCell.includes('retained')) {
      continue;
    }
    
    // Check if this is a project header row (contains "PHASE" in it)
    const rowText = row.join(' ').toUpperCase();
    if (rowText.includes('PHASE') || rowText.includes('GARDENS') || 
        rowText.includes('LESHAOO') || rowText.includes('LESHAO') ||
        rowText.includes('RUMURUTI') || rowText.includes('KCA') ||
        rowText.includes('MADARAKA') || rowText.includes('TULIP')) {
      // Extract project name
      const projectMatch = rowText.match(/(KONZA PHASE \w+|TULIP GARDENS|LESHAOO|LESHAO(?:\s+PHASE\s+\w+)?|RUMURUTI|KCA|MADARAKA)/i);
      if (projectMatch) {
        currentProject = projectMatch[1].trim();
      }
      continue;
    }
    
    // Get cell values
    const clientName = (row[0] || '').toString().trim();
    const agent = (row[1] || '').toString().trim();
    const projectCell = (row[2] || '').toString().trim();
    const plotInfo = (row[3] || '').toString().trim();
    const totalAmount = (row[4] || '').toString().trim();
    const paymentData = (row[5] || '').toString().trim();
    const balance = (row[6] || '').toString().trim();
    const lastPaymentDate = (row[7] || '').toString().trim();
    const status = (row[8] || '').toString().trim();
    
    // If we have a client name, this is a new client row
    if (clientName && !clientName.toLowerCase().includes('client name')) {
      // Save previous client if exists
      if (currentClient && currentClient.client.name) {
        results.push(currentClient);
      }
      
      const { name, phone } = extractPhone(clientName);
      const plotsInfo = parsePlotsInfo(plotInfo);
      const projectName = projectCell || currentProject;
      const totalPrice = parseAmount(totalAmount);
      const balanceAmount = parseBalance(balance);
      
      // Calculate total paid from total price and balance
      let totalPaid = totalPrice - balanceAmount;
      if (totalPaid < 0) totalPaid = 0;
      
      currentClient = {
        client: {
          name,
          phone,
          project_name: projectName,
          plot_number: plotsInfo.numbers || plotInfo,
          unit_price: totalPrice / (plotsInfo.count || 1),
          number_of_plots: plotsInfo.count,
          total_price: totalPrice,
          discount: 0,
          total_paid: totalPaid,
          balance: balanceAmount,
          sales_agent: agent,
          payment_type: balanceAmount > 0 ? 'installments' : 'cash',
          payment_period: '',
          installment_months: null,
          initial_payment_method: 'Cash',
          completion_date: null,
          next_payment_date: parsePaymentDate(lastPaymentDate),
          notes: '',
          status: parseStatus(status),
          sale_date: null,
        },
        payments: []
      };
      
      // Parse first payment if exists
      if (paymentData) {
        const payment = parsePaymentEntry(paymentData);
        if (payment) {
          currentClient.payments.push({
            amount: payment.amount,
            payment_date: payment.date,
            notes: ''
          });
        }
      }
    } 
    // This is a continuation row with more payments for the current client
    else if (currentClient && paymentData) {
      const payment = parsePaymentEntry(paymentData);
      if (payment) {
        currentClient.payments.push({
          amount: payment.amount,
          payment_date: payment.date,
          notes: ''
        });
      }
      
      // Check if balance is updated in this row
      if (balance) {
        currentClient.client.balance = parseBalance(balance);
      }
      
      // Check if status is updated
      if (status) {
        currentClient.client.status = parseStatus(status);
      }
    }
  }
  
  // Don't forget the last client
  if (currentClient && currentClient.client.name) {
    results.push(currentClient);
  }
  
  // Post-process: Recalculate total_paid from payments if available
  for (const data of results) {
    if (data.payments.length > 0) {
      const paymentsTotal = data.payments.reduce((sum, p) => sum + p.amount, 0);
      if (paymentsTotal > 0) {
        data.client.total_paid = paymentsTotal;
        // Recalculate balance
        data.client.balance = Math.max(0, data.client.total_price - paymentsTotal);
      }
    }
  }
  
  return results;
};
