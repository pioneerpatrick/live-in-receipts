import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { ReceiptData } from '@/types/client';
import { supabase } from '@/integrations/supabase/client';
import signatureImage from '@/assets/signature.png';
import logoImage from '@/assets/logo.jpg';

const APP_BASE_URL = window.location.origin;

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
  const sectionY = footerY - 50; // Position 50px above footer

  // Draw a subtle separator line above QR and Signature
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(20, sectionY - 5, pageWidth - 20, sectionY - 5);
  
  // QR Code on the left
  try {
    const paymentHistoryUrl = `${APP_BASE_URL}/payments/${receipt.clientId}`;
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

const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString()}`;
};