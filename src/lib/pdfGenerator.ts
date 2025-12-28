import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { ReceiptData } from '@/types/client';
import signatureImage from '@/assets/signature.png';
import logoImage from '@/assets/logo.jpg';

const COMPANY_WEBSITE = 'https://live-inproperties.co.ke';

export const generatePDFReceipt = async (receipt: ReceiptData): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [0, 150, 136]; // Teal
  const secondaryColor: [number, number, number] = [25, 118, 210]; // Blue
  const textColor: [number, number, number] = [33, 33, 33];
  const mutedColor: [number, number, number] = [117, 117, 117];
  
  let y = 20;
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Add logo
  doc.addImage(logoImage, 'JPEG', 15, 5, 25, 25);
  
  // Company Name (positioned next to logo)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('LIVE-IN PROPERTIES', pageWidth / 2 + 10, y, { align: 'center' });
  
  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Genuine plots with ready title deeds', pageWidth / 2 + 10, y, { align: 'center' });
  
  y += 6;
  doc.setFontSize(8);
  doc.text('+254 746 499 499  |  liveinpropertiesltd@gmail.com  |  info@liveinproperties.co.ke', pageWidth / 2 + 10, y, { align: 'center' });
  
  y += 5;
  doc.text('@Live-IN Properties  |  www.liveinproperties.co.ke  |  Kitengela Africa House', pageWidth / 2 + 10, y, { align: 'center' });
  
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
  
  // Signature image
  y += 15;
  doc.addImage(signatureImage, 'PNG', pageWidth - 75, y - 15, 50, 25);
  
  // Signature line
  y += 15;
  doc.setDrawColor(...mutedColor);
  doc.setLineWidth(0.2);
  doc.line(pageWidth - 80, y, pageWidth - 20, y);
  y += 5;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.text('Authorized Signature', pageWidth - 50, y, { align: 'center' });
  
  // Generate QR Code
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(COMPANY_WEBSITE, {
      width: 100,
      margin: 1,
      color: {
        dark: '#009688',
        light: '#ffffff'
      }
    });
    
    // Add QR code to bottom left
    const qrY = doc.internal.pageSize.getHeight() - 55;
    doc.addImage(qrCodeDataUrl, 'PNG', 20, qrY, 25, 25);
    
    // QR code label
    doc.setTextColor(...mutedColor);
    doc.setFontSize(7);
    doc.text('Scan to verify', 32.5, qrY + 28, { align: 'center' });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
  }
  
  // Footer
  y = doc.internal.pageSize.getHeight() - 30;
  
  doc.setFillColor(...secondaryColor);
  doc.rect(0, y - 5, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for choosing Live-IN Properties. We Secure your Future.', pageWidth / 2, y + 5, { align: 'center' });
  
  // Save the PDF
  doc.save(`Receipt_${receipt.receiptNumber}.pdf`);
};

const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString()}`;
};
