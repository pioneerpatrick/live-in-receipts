import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Client, Payment } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { format } from 'date-fns';

const getTimeRangeLabel = (timeRange: string): string => {
  switch (timeRange) {
    case '7d': return 'Last 7 Days';
    case '30d': return 'Last 30 Days';
    case '90d': return 'Last 90 Days';
    case '1y': return 'Last Year';
    default: return 'All Time';
  }
};

export const exportAccountingToPDF = (
  clients: Client[],
  payments: Payment[],
  timeRange: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Accounting Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${getTimeRangeLabel(timeRange)}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Summary Section
  const totalSalesValue = clients.reduce((sum, c) => sum + c.total_price, 0);
  const totalCollected = clients.reduce((sum, c) => sum + c.total_paid, 0);
  const totalBalance = clients.reduce((sum, c) => sum + c.balance, 0);
  const totalDiscount = clients.reduce((sum, c) => sum + c.discount, 0);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Summary', 14, yPos);
  yPos += 10;

  const summaryData = [
    ['Total Sales Value', formatCurrency(totalSalesValue)],
    ['Total Discounts', formatCurrency(totalDiscount)],
    ['Net Revenue', formatCurrency(totalSalesValue - totalDiscount)],
    ['Total Collected', formatCurrency(totalCollected)],
    ['Outstanding Balance', formatCurrency(totalBalance)],
    ['Collection Rate', `${totalSalesValue > 0 ? ((totalCollected / totalSalesValue) * 100).toFixed(1) : 0}%`],
    ['Total Clients', clients.length.toString()],
    ['Total Payments', payments.length.toString()],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Project Revenue
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Revenue by Project', 14, yPos);
  yPos += 10;

  const projectData: { [key: string]: { collected: number; balance: number; clients: number } } = {};
  clients.forEach(client => {
    if (!projectData[client.project_name]) {
      projectData[client.project_name] = { collected: 0, balance: 0, clients: 0 };
    }
    projectData[client.project_name].collected += client.total_paid;
    projectData[client.project_name].balance += client.balance;
    projectData[client.project_name].clients += 1;
  });

  const projectRows = Object.entries(projectData)
    .sort(([, a], [, b]) => b.collected - a.collected)
    .map(([project, data]) => [
      project,
      formatCurrency(data.collected),
      formatCurrency(data.balance),
      data.clients.toString(),
    ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Project', 'Collected', 'Balance', 'Clients']],
    body: projectRows,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Agent Performance
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Agent Performance', 14, yPos);
  yPos += 10;

  const agentData: { [key: string]: { sales: number; collected: number; clients: number } } = {};
  clients.forEach(client => {
    const agent = client.sales_agent || 'Unknown';
    if (!agentData[agent]) {
      agentData[agent] = { sales: 0, collected: 0, clients: 0 };
    }
    agentData[agent].sales += client.total_price;
    agentData[agent].collected += client.total_paid;
    agentData[agent].clients += 1;
  });

  const agentRows = Object.entries(agentData)
    .sort(([, a], [, b]) => b.collected - a.collected)
    .map(([agent, data]) => [
      agent,
      formatCurrency(data.sales),
      formatCurrency(data.collected),
      data.clients.toString(),
      `${data.sales > 0 ? ((data.collected / data.sales) * 100).toFixed(1) : 0}%`,
    ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Agent', 'Total Sales', 'Collected', 'Clients', 'Rate']],
    body: agentRows,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 },
  });

  // Client Balances (new page)
  doc.addPage();
  yPos = 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Outstanding Client Balances', 14, yPos);
  yPos += 10;

  const clientBalances = clients
    .filter(c => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 30)
    .map(c => [c.name, c.project_name, c.phone || '-', formatCurrency(c.balance)]);

  autoTable(doc, {
    startY: yPos,
    head: [['Client', 'Project', 'Phone', 'Balance']],
    body: clientBalances,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`accounting-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const exportAccountingToExcel = (
  clients: Client[],
  payments: Payment[],
  timeRange: string
) => {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const totalSalesValue = clients.reduce((sum, c) => sum + c.total_price, 0);
  const totalCollected = clients.reduce((sum, c) => sum + c.total_paid, 0);
  const totalBalance = clients.reduce((sum, c) => sum + c.balance, 0);
  const totalDiscount = clients.reduce((sum, c) => sum + c.discount, 0);

  const summaryData = [
    ['Accounting Report'],
    [`Period: ${getTimeRangeLabel(timeRange)}`],
    [`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
    [],
    ['Metric', 'Value'],
    ['Total Sales Value', totalSalesValue],
    ['Total Discounts', totalDiscount],
    ['Net Revenue', totalSalesValue - totalDiscount],
    ['Total Collected', totalCollected],
    ['Outstanding Balance', totalBalance],
    ['Collection Rate', `${totalSalesValue > 0 ? ((totalCollected / totalSalesValue) * 100).toFixed(1) : 0}%`],
    ['Total Clients', clients.length],
    ['Total Payments', payments.length],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Project Revenue Sheet
  const projectData: { [key: string]: { salesValue: number; collected: number; balance: number; discount: number; clients: number } } = {};
  clients.forEach(client => {
    if (!projectData[client.project_name]) {
      projectData[client.project_name] = { salesValue: 0, collected: 0, balance: 0, discount: 0, clients: 0 };
    }
    projectData[client.project_name].salesValue += client.total_price;
    projectData[client.project_name].collected += client.total_paid;
    projectData[client.project_name].balance += client.balance;
    projectData[client.project_name].discount += client.discount;
    projectData[client.project_name].clients += 1;
  });

  const projectRows = [
    ['Project', 'Sales Value', 'Discount', 'Collected', 'Balance', 'Clients', 'Collection Rate'],
    ...Object.entries(projectData)
      .sort(([, a], [, b]) => b.collected - a.collected)
      .map(([project, data]) => [
        project,
        data.salesValue,
        data.discount,
        data.collected,
        data.balance,
        data.clients,
        `${data.salesValue > 0 ? ((data.collected / data.salesValue) * 100).toFixed(1) : 0}%`,
      ]),
  ];
  const projectSheet = XLSX.utils.aoa_to_sheet(projectRows);
  XLSX.utils.book_append_sheet(workbook, projectSheet, 'Project Revenue');

  // Agent Performance Sheet
  const agentData: { [key: string]: { sales: number; collected: number; clients: number } } = {};
  clients.forEach(client => {
    const agent = client.sales_agent || 'Unknown';
    if (!agentData[agent]) {
      agentData[agent] = { sales: 0, collected: 0, clients: 0 };
    }
    agentData[agent].sales += client.total_price;
    agentData[agent].collected += client.total_paid;
    agentData[agent].clients += 1;
  });

  const agentRows = [
    ['Agent', 'Total Sales', 'Collected', 'Outstanding', 'Clients', 'Collection Rate'],
    ...Object.entries(agentData)
      .sort(([, a], [, b]) => b.collected - a.collected)
      .map(([agent, data]) => [
        agent,
        data.sales,
        data.collected,
        data.sales - data.collected,
        data.clients,
        `${data.sales > 0 ? ((data.collected / data.sales) * 100).toFixed(1) : 0}%`,
      ]),
  ];
  const agentSheet = XLSX.utils.aoa_to_sheet(agentRows);
  XLSX.utils.book_append_sheet(workbook, agentSheet, 'Agent Performance');

  // Client Balances Sheet
  const clientBalanceRows = [
    ['Client', 'Phone', 'Project', 'Plot', 'Total Price', 'Discount', 'Total Paid', 'Balance', 'Status'],
    ...clients
      .sort((a, b) => b.balance - a.balance)
      .map(c => [
        c.name,
        c.phone || '',
        c.project_name,
        c.plot_number,
        c.total_price,
        c.discount,
        c.total_paid,
        c.balance,
        c.status || 'ongoing',
      ]),
  ];
  const clientSheet = XLSX.utils.aoa_to_sheet(clientBalanceRows);
  XLSX.utils.book_append_sheet(workbook, clientSheet, 'Client Balances');

  // Payment Ledger Sheet
  const clientMap = new Map<string, Client>();
  clients.forEach(c => clientMap.set(c.id, c));

  const paymentRows = [
    ['Date', 'Receipt #', 'Client', 'Project', 'Amount', 'Method', 'Agent', 'Previous Balance', 'New Balance'],
    ...payments
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .map(p => {
        const client = clientMap.get(p.client_id);
        return [
          format(new Date(p.payment_date), 'dd/MM/yyyy'),
          p.receipt_number,
          client?.name || 'Unknown',
          client?.project_name || 'Unknown',
          p.amount,
          p.payment_method,
          p.agent_name || '',
          p.previous_balance,
          p.new_balance,
        ];
      }),
  ];
  const paymentSheet = XLSX.utils.aoa_to_sheet(paymentRows);
  XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Payment Ledger');

  XLSX.writeFile(workbook, `accounting-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};
