import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { ReceiptData } from '@/types/client';
import { supabase } from '@/integrations/supabase/client';
import signatureImage from '@/assets/signature.png';
import logoImage from '@/assets/logo.jpg';

// Fallback production URL for QR codes (used if not configured in settings)
const DEFAULT_APP_BASE_URL = 'https://live-inreciepts.lovable.app';

interface CompanySettings {
  company_name: string;
  company_tagline: string | null;
  phone: string | null;
  email: string | null;
  email_secondary: string | null;
  social_handle: string | null;
  website: string | null;
  address: string | null;
  po_box: string | null;
  receipt_footer_message: string | null;
  receipt_watermark: string | null;
  logo_url: string | null;
  production_url: string | null;
}

const getCompanySettings = async (): Promise<CompanySettings> => {
  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .maybeSingle();

  return data || {
    company_name: 'LIVE-IN PROPERTIES',
    company_tagline: 'Genuine plots with ready title deeds',
    phone: '+254 746 499 499',
    email: 'liveinpropertiesltd@gmail.com',
    email_secondary: 'info@liveinproperties.co.ke',
    social_handle: '@Live-IN Properties',
    website: 'www.liveinproperties.co.ke',
    address: 'Kitengela Africa House',
    po_box: 'P.O. Box 530-00241, KITENGELA',
    receipt_footer_message: 'Thank you for choosing Live-IN Properties. We Secure your Future.',
    receipt_watermark: 'LIVE-IN PROPERTIES',
    logo_url: null,
    production_url: null,
  };
};

const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const generatePDFReceipt = async (receipt: ReceiptData): Promise<void> => {
  const settings = await getCompanySettings();
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colors
  const primaryColor: [number, number, number] = [0, 150, 136]; // Teal
  const secondaryColor: [number, number, number] = [25, 118, 210]; // Blue
  const textColor: [number, number, number] = [33, 33, 33];
  const mutedColor: [number, number, number] = [117, 117, 117];
  
  // Add watermark first (behind all content)
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
  doc.setTextColor(0, 150, 136);
  doc.setFontSize(60);
  doc.setFont('helvetica', 'bold');
  
  // Rotate and center the watermark text
  const watermarkText = settings.receipt_watermark || settings.company_name;
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  
  // Apply rotation transform
  doc.text(watermarkText, centerX, centerY, { 
    align: 'center',
    angle: 45
  });
  doc.restoreGraphicsState();
  
  let y = 20;
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Add logo - use custom logo if available, otherwise use default
  if (settings.logo_url) {
    const customLogoBase64 = await loadImageAsBase64(settings.logo_url);
    if (customLogoBase64) {
      doc.addImage(customLogoBase64, 'PNG', 15, 5, 25, 25);
    } else {
      doc.addImage(logoImage, 'JPEG', 15, 5, 25, 25);
    }
  } else {
    doc.addImage(logoImage, 'JPEG', 15, 5, 25, 25);
  }
  
  // Company Name (positioned next to logo)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.company_name, pageWidth / 2 + 10, y, { align: 'center' });
  
  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.company_tagline || '', pageWidth / 2 + 10, y, { align: 'center' });
  
  y += 6;
  doc.setFontSize(8);
  const contactLine1 = `${settings.phone || ''}  |  ${settings.email || ''}  |  ${settings.email_secondary || ''}`;
  doc.text(contactLine1, pageWidth / 2 + 10, y, { align: 'center' });
  
  y += 5;
  const contactLine2 = `${settings.social_handle || ''}  |  ${settings.website || ''}  |  ${settings.address || ''}`;
  doc.text(contactLine2, pageWidth / 2 + 10, y, { align: 'center' });
  
  // Receipt Title
  y = 60;
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageWidth / 2, y, { align: 'center' });
  
  // Receipt Number and Date
  y += 12;
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No: ${receipt.receiptNumber}`, 20, y);
  doc.text(`Date: ${receipt.date}`, pageWidth - 20, y, { align: 'right' });
  
  // Divider line
  y += 8;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  
  // Client Details Section
  y += 12;
  doc.setFillColor(240, 248, 247);
  doc.rect(15, y - 5, pageWidth - 30, 35, 'F');
  
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT DETAILS', 20, y + 2);
  
  y += 12;
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const leftCol = 20;
  const rightCol = pageWidth / 2 + 10;
  
  doc.setTextColor(...mutedColor);
  doc.text('Client Name:', leftCol, y);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text(receipt.clientName, leftCol + 30, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text('Phone:', rightCol, y);
  doc.setTextColor(...textColor);
  doc.text(receipt.clientPhone, rightCol + 20, y);
  
  y += 8;
  doc.setTextColor(...mutedColor);
  doc.text('Project:', leftCol, y);
  doc.setTextColor(...textColor);
  doc.text(receipt.projectName, leftCol + 30, y);
  
  doc.setTextColor(...mutedColor);
  doc.text('Plot No:', rightCol, y);
  doc.setTextColor(...textColor);
  doc.text(receipt.plotNumber, rightCol + 20, y);
  
  // Property Details Section
  y += 20;
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPERTY & PAYMENT DETAILS', 20, y);
  
  y += 10;
  
  // Create table-like layout
  const tableData = [
    ['Total Price:', formatCurrency(receipt.totalPrice)],
    ['Discount Applied:', formatCurrency(receipt.discount)],
    ['Price After Discount:', formatCurrency(receipt.discountedPrice)],
    ['Previous Balance:', formatCurrency(receipt.previousBalance)],
    ['Amount Paid Now:', formatCurrency(receipt.currentPayment)],
    ['Payment Method:', receipt.paymentMethod],
    ['Total Paid to Date:', formatCurrency(receipt.totalPaid)],
    ['Remaining Balance:', formatCurrency(receipt.remainingBalance)],
  ];
  
  tableData.forEach((row, index) => {
    const isHighlight = index === 4 || index === 7; // Amount Paid and Remaining Balance
    
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 4, pageWidth - 30, 10, 'F');
    }
    
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(row[0], 20, y);
    
    if (isHighlight) {
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(...textColor);
    }
    doc.text(row[1], pageWidth - 20, y, { align: 'right' });
    
    y += 10;
  });
  
  // Agent Details
  y += 5;
  doc.setDrawColor(...primaryColor);
  doc.line(20, y, pageWidth - 20, y);
  
  y += 12;
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Sales Agent:', 20, y);
  doc.setTextColor(...textColor);
  doc.text(receipt.agentName, 55, y);
  
  if (receipt.authorizedBy) {
    doc.setTextColor(...mutedColor);
    doc.text('Authorized By:', rightCol, y);
    doc.setTextColor(...textColor);
    doc.text(receipt.authorizedBy, rightCol + 35, y);
  }
  
  // PAID Stamp - rectangular style with rotation and ink texture for authentic look
  const stampCenterX = pageWidth / 2;
  const stampCenterY = 175;
  const stampWidth = 85;
  const stampHeight = 48;
  const rotationAngle = -6; // Slight counter-clockwise rotation for authentic look
  
  // Blue color for stamp border and text
  const stampBlue: [number, number, number] = [25, 55, 160]; // Deep blue
  const stampRed: [number, number, number] = [185, 25, 25]; // Bold red for PAID and date
  
  doc.saveGraphicsState();
  
  // Apply rotation transformation around the stamp center
  const radians = (rotationAngle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  // Transform matrix for rotation around center point
  const a = cos;
  const b = sin;
  const c = -sin;
  const d = cos;
  const e = stampCenterX - cos * stampCenterX + sin * stampCenterY;
  const f = stampCenterY - sin * stampCenterX - cos * stampCenterY;
  
  // Apply transformation matrix
  (doc as any).internal.write(`q ${a.toFixed(4)} ${b.toFixed(4)} ${c.toFixed(4)} ${d.toFixed(4)} ${e.toFixed(4)} ${f.toFixed(4)} cm`);
  
  const stampX = stampCenterX - stampWidth / 2;
  const stampY = stampCenterY - stampHeight / 2;
  
  // Ink texture effect - draw multiple overlapping elements with varying opacity
  const drawWithInkVariation = (drawFn: () => void, variations: number = 3) => {
    for (let i = 0; i < variations; i++) {
      const offsetX = (Math.random() - 0.5) * 0.3;
      const offsetY = (Math.random() - 0.5) * 0.3;
      const opacity = 0.7 + Math.random() * 0.25;
      doc.setGState(new (doc as any).GState({ opacity }));
      doc.saveGraphicsState();
      (doc as any).internal.write(`1 0 0 1 ${offsetX.toFixed(3)} ${offsetY.toFixed(3)} cm`);
      drawFn();
      doc.restoreGraphicsState();
    }
  };
  
  // Draw outer rectangle border with ink variation
  doc.setDrawColor(...stampBlue);
  drawWithInkVariation(() => {
    doc.setLineWidth(2.5);
    doc.rect(stampX, stampY, stampWidth, stampHeight, 'S');
  }, 2);
  
  // Draw inner rectangle border
  drawWithInkVariation(() => {
    doc.setLineWidth(1.2);
    doc.rect(stampX + 3.5, stampY + 3.5, stampWidth - 7, stampHeight - 7, 'S');
  }, 2);
  
  // Company name - single line, blue (Times font)
  doc.setGState(new (doc as any).GState({ opacity: 0.85 }));
  doc.setTextColor(...stampBlue);
  doc.setFontSize(9);
  doc.setFont('times', 'bold');
  doc.text(`${settings.company_name} LIMITED`, stampCenterX, stampY + 10, { align: 'center' });
  
  // PAID text in center - LARGE, BOLD, RED - SHOUTING
  doc.setGState(new (doc as any).GState({ opacity: 0.92 }));
  doc.setTextColor(...stampRed);
  doc.setFontSize(28);
  doc.setFont('times', 'bold');
  doc.text('PAID', stampCenterX, stampY + 26, { align: 'center' });
  
  // Date - LARGE, RED, prominent
  doc.setFontSize(13);
  doc.setFont('times', 'bold');
  doc.text(receipt.date, stampCenterX, stampY + 35, { align: 'center' });
  
  // Address - single line, blue
  doc.setGState(new (doc as any).GState({ opacity: 0.8 }));
  doc.setTextColor(...stampBlue);
  doc.setFontSize(8);
  doc.setFont('times', 'bold');
  doc.text(settings.po_box || '', stampCenterX, stampY + 43, { align: 'center' });
  
  // Reset transformation
  (doc as any).internal.write('Q');
  
  doc.restoreGraphicsState();
  
  // QR Code and Signature Section - positioned just above footer
  const footerY = pageHeight - 20;
  const sectionY = footerY - 45; // Position 45px above footer

  // Draw a subtle separator line above QR and Signature
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(20, sectionY - 5, pageWidth - 20, sectionY - 5);
  
  // QR Code on the left
  try {
    const baseUrl = settings.production_url || DEFAULT_APP_BASE_URL;
    const paymentHistoryUrl = `${baseUrl}/payments/${receipt.clientId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(paymentHistoryUrl, {
      width: 100,
      margin: 1,
      color: {
        dark: '#009688',
        light: '#ffffff'
      }
    });
    
    doc.addImage(qrCodeDataUrl, 'PNG', 20, sectionY, 28, 28);
    
    // QR code label
    doc.setTextColor(...mutedColor);
    doc.setFontSize(7);
    doc.text('Scan for payment history', 34, sectionY + 32, { align: 'center' });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
  }
  
  // Signature on the right - aligned with QR code
  doc.addImage(signatureImage, 'PNG', pageWidth - 70, sectionY, 45, 22);
  
  // Signature line
  doc.setDrawColor(...mutedColor);
  doc.setLineWidth(0.2);
  doc.line(pageWidth - 75, sectionY + 25, pageWidth - 20, sectionY + 25);
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.text('Authorized Signature', pageWidth - 47, sectionY + 30, { align: 'center' });
  
  // Footer - at the very bottom
  doc.setFillColor(...secondaryColor);
  doc.rect(0, footerY - 10, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.receipt_footer_message || '', pageWidth / 2, footerY, { align: 'center' });
  
  // Save the PDF
  doc.save(`Receipt_${receipt.receiptNumber}.pdf`);
};

export const generatePaymentHistoryPDF = async (client: any, payments: any[]): Promise<void> => {
  const settings = await getCompanySettings();
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [0, 150, 136];
  const secondaryColor: [number, number, number] = [25, 118, 210];
  const textColor: [number, number, number] = [33, 33, 33];
  const mutedColor: [number, number, number] = [117, 117, 117];
  
  let y = 20;
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Add logo
  if (settings.logo_url) {
    const customLogoBase64 = await loadImageAsBase64(settings.logo_url);
    if (customLogoBase64) {
      doc.addImage(customLogoBase64, 'PNG', 15, 5, 22, 22);
    } else {
      doc.addImage(logoImage, 'JPEG', 15, 5, 22, 22);
    }
  } else {
    doc.addImage(logoImage, 'JPEG', 15, 5, 22, 22);
  }
  
  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.company_name, pageWidth / 2 + 10, y, { align: 'center' });
  
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.company_tagline || '', pageWidth / 2 + 10, y, { align: 'center' });
  
  y += 6;
  doc.setFontSize(7);
  const contactLine = `${settings.phone || ''} | ${settings.email || ''} | ${settings.website || ''}`;
  doc.text(contactLine, pageWidth / 2 + 10, y, { align: 'center' });
  
  // Title
  y = 55;
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT HISTORY STATEMENT', pageWidth / 2, y, { align: 'center' });
  
  // Date generated
  y += 8;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth / 2, y, { align: 'center' });
  
  // Client Details Section
  y += 12;
  doc.setFillColor(240, 248, 247);
  doc.rect(15, y - 3, pageWidth - 30, 32, 'F');
  
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT DETAILS', 20, y + 3);
  
  y += 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const leftCol = 20;
  const rightCol = pageWidth / 2 + 10;
  
  doc.setTextColor(...mutedColor);
  doc.text('Client Name:', leftCol, y);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text(client.name, leftCol + 28, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text('Phone:', rightCol, y);
  doc.setTextColor(...textColor);
  doc.text(client.phone || '', rightCol + 18, y);
  
  y += 7;
  doc.setTextColor(...mutedColor);
  doc.text('Project:', leftCol, y);
  doc.setTextColor(...textColor);
  doc.text(client.project_name, leftCol + 28, y);
  
  doc.setTextColor(...mutedColor);
  doc.text('Plot No:', rightCol, y);
  doc.setTextColor(...textColor);
  doc.text(client.plot_number, rightCol + 18, y);
  
  y += 7;
  doc.setTextColor(...mutedColor);
  doc.text('Total Price:', leftCol, y);
  doc.setTextColor(...textColor);
  doc.text(formatCurrency(client.total_price - client.discount), leftCol + 28, y);
  
  doc.setTextColor(...mutedColor);
  doc.text('Balance:', rightCol, y);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(client.balance), rightCol + 18, y);
  
  // Payments Table Header
  y += 18;
  doc.setFillColor(...secondaryColor);
  doc.rect(15, y - 4, pageWidth - 30, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt No.', 18, y + 2);
  doc.text('Date', 60, y + 2);
  doc.text('Amount', 105, y + 2, { align: 'right' });
  doc.text('Method', 115, y + 2);
  doc.text('Balance After', pageWidth - 20, y + 2, { align: 'right' });
  
  y += 10;
  
  // Payment Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  payments.forEach((payment, index) => {
    // Check if we need a new page
    if (y > 260) {
      doc.addPage();
      y = 20;
      
      // Repeat header on new page
      doc.setFillColor(...secondaryColor);
      doc.rect(15, y - 4, pageWidth - 30, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('Receipt No.', 18, y + 2);
      doc.text('Date', 60, y + 2);
      doc.text('Amount', 105, y + 2, { align: 'right' });
      doc.text('Method', 115, y + 2);
      doc.text('Balance After', pageWidth - 20, y + 2, { align: 'right' });
      y += 10;
      doc.setFont('helvetica', 'normal');
    }
    
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 4, pageWidth - 30, 9, 'F');
    }
    
    const paymentDate = new Date(payment.payment_date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    doc.setTextColor(...textColor);
    doc.setFontSize(7);
    doc.text(payment.receipt_number, 18, y + 1);
    doc.text(paymentDate, 60, y + 1);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(payment.amount), 105, y + 1, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.text(payment.payment_method, 115, y + 1);
    doc.text(formatCurrency(payment.new_balance), pageWidth - 20, y + 1, { align: 'right' });
    
    y += 9;
  });
  
  // Summary Section
  y += 5;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  
  y += 10;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  doc.setFillColor(240, 248, 247);
  doc.rect(pageWidth - 100, y - 5, 85, 25, 'F');
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.text('Total Payments:', pageWidth - 95, y + 2);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(formatCurrency(totalPaid), pageWidth - 20, y + 2, { align: 'right' });
  
  y += 10;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Current Balance:', pageWidth - 95, y + 2);
  doc.setTextColor(client.balance === 0 ? primaryColor[0] : 185, client.balance === 0 ? primaryColor[1] : 25, client.balance === 0 ? primaryColor[2] : 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(formatCurrency(client.balance), pageWidth - 20, y + 2, { align: 'right' });
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.receipt_footer_message || '', pageWidth / 2, footerY, { align: 'center' });
  
  // Save
  doc.save(`Payment_History_${client.name.replace(/\s+/g, '_')}.pdf`);
};

const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString()}`;
};