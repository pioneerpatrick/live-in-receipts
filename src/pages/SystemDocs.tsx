import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, Receipt, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import logoImage from '@/assets/logo.jpg';

const SystemDocs = () => {
  const [generatingOverview, setGeneratingOverview] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const generateSystemOverviewPDF = async () => {
    setGeneratingOverview(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Colors
      const primaryColor: [number, number, number] = [0, 128, 128]; // Teal
      const secondaryColor: [number, number, number] = [0, 51, 102]; // Dark Blue
      const textColor: [number, number, number] = [33, 33, 33];
      const mutedColor: [number, number, number] = [100, 100, 100];
      
      let y = 15;

      // Header background
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      // Add logo
      try {
        doc.addImage(logoImage, 'JPEG', 15, 8, 35, 35);
      } catch (e) {
        console.log('Logo not loaded');
      }

      // Company name and tagline
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('LIVE-IN PROPERTIES', 55, 22);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Genuine plots with ready title deeds', 55, 30);
      
      doc.setFontSize(8);
      doc.text('Phone: 0746499499 | Email: liveinproperties2021@gmail.com', 55, 38);
      doc.text('Website: live-inproperties.co.ke', 55, 44);

      y = 60;

      // Title
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('RECEIPT MANAGEMENT SYSTEM', pageWidth / 2, y, { align: 'center' });
      y += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('System Overview & Feature Documentation', pageWidth / 2, y, { align: 'center' });
      
      y += 15;

      // Decorative line
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      // Executive Summary
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('EXECUTIVE SUMMARY', 20, y);
      y += 7;
      
      doc.setTextColor(...textColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const summary = 'A comprehensive, cloud-based real estate management platform designed specifically for property sales companies in Kenya. The system streamlines client management, payment tracking, receipt generation, and financial reporting.';
      const summaryLines = doc.splitTextToSize(summary, pageWidth - 40);
      doc.text(summaryLines, 20, y);
      y += summaryLines.length * 5 + 10;

      // Features Section
      const features = [
        { title: 'Client Management', items: ['Centralized client database', 'Multi-plot support', 'Status tracking (Ongoing/Completed/Cancelled)', 'Sales agent assignment'] },
        { title: 'Payment Processing', items: ['Installment tracking', 'Multiple payment methods (Cash, M-Pesa, Bank, Cheque)', 'Automatic balance updates', 'Payment reminders'] },
        { title: 'Receipt Generation', items: ['Professional branded PDF receipts', 'QR code integration', 'Auto-numbering', 'Digital signatures'] },
        { title: 'Project & Plot Management', items: ['Multiple project support', 'Plot inventory tracking', 'Bulk plot creation', 'Visual dashboard'] },
        { title: 'Financial Reporting', items: ['Accounting dashboard', 'Revenue charts', 'Profit & Loss statements', 'Excel/PDF export'] },
        { title: 'Payroll (Kenya-Specific)', items: ['PAYE calculation', 'NHIF/NSSF deductions', 'Housing Levy', 'Payslip & P9 generation'] },
      ];

      doc.setTextColor(...secondaryColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('CORE FEATURES', 20, y);
      y += 8;

      let col = 0;
      const colWidth = (pageWidth - 50) / 2;
      const startX = 20;
      let startY = y;

      features.forEach((feature, idx) => {
        const x = startX + (col * (colWidth + 10));
        
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 20;
          startY = y;
        }

        // Feature box
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(x, y - 4, colWidth, 32, 2, 2, 'F');
        
        doc.setTextColor(...primaryColor);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(feature.title, x + 3, y + 2);
        
        doc.setTextColor(...mutedColor);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        feature.items.forEach((item, i) => {
          doc.text(`• ${item}`, x + 5, y + 8 + (i * 5));
        });

        col++;
        if (col >= 2) {
          col = 0;
          y += 38;
        }
      });

      if (col !== 0) y += 38;
      y += 5;

      // Additional Features
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(...secondaryColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ADDITIONAL FEATURES', 20, y);
      y += 8;

      const additionalFeatures = [
        'User Management & Security - Role-based access, activity logging, secure authentication',
        'Data Import/Export - Excel import, database backup, bulk data operations',
        'Email Notifications - Payment confirmations, reminders, admin alerts',
        'Analytics & Insights - Dashboard metrics, revenue analysis, project performance',
        'Expense Management - Expense tracking, commission reports, category management'
      ];

      doc.setTextColor(...textColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      additionalFeatures.forEach(feature => {
        doc.text(`✓ ${feature}`, 22, y);
        y += 6;
      });

      y += 8;

      // Technical Specs
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(...secondaryColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TECHNICAL SPECIFICATIONS', 20, y);
      y += 8;

      const techSpecs = [
        ['Frontend', 'React.js with TypeScript'],
        ['Styling', 'Tailwind CSS'],
        ['Backend', 'Cloud PostgreSQL Database'],
        ['Authentication', 'Secure Session Management'],
        ['PDF Generation', 'jsPDF Library'],
        ['Email Service', 'Resend API'],
      ];

      doc.setFontSize(9);
      techSpecs.forEach(([label, value]) => {
        doc.setTextColor(...mutedColor);
        doc.setFont('helvetica', 'bold');
        doc.text(label + ':', 22, y);
        doc.setTextColor(...textColor);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 70, y);
        y += 6;
      });

      // Footer
      const footerY = pageHeight - 15;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
      
      doc.setTextColor(...mutedColor);
      doc.setFontSize(8);
      doc.text('Thank you for choosing Live-IN Properties. We Secure your Future.', pageWidth / 2, footerY, { align: 'center' });
      doc.text('Document Version 1.0 | January 2026', pageWidth / 2, footerY + 5, { align: 'center' });

      doc.save('LiveIN-Properties-System-Overview.pdf');
      toast.success('System Overview PDF downloaded!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingOverview(false);
    }
  };

  const generateInvoicePDF = async () => {
    setGeneratingInvoice(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Colors
      const primaryColor: [number, number, number] = [0, 128, 128]; // Teal
      const secondaryColor: [number, number, number] = [0, 51, 102]; // Dark Blue
      const textColor: [number, number, number] = [33, 33, 33];
      const mutedColor: [number, number, number] = [100, 100, 100];
      
      let y = 15;

      // Header background
      doc.setFillColor(...secondaryColor);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Add logo
      try {
        doc.addImage(logoImage, 'JPEG', 15, 8, 30, 30);
      } catch (e) {
        console.log('Logo not loaded');
      }

      // Developer info
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('TECHNOPANALY SOLUTIONS', 50, 20);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Software Development & IT Consulting', 50, 28);
      doc.text('Nairobi, Kenya', 50, 34);

      // Invoice badge
      doc.setFillColor(...primaryColor);
      doc.roundedRect(pageWidth - 50, 10, 40, 25, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', pageWidth - 30, 26, { align: 'center' });

      y = 55;

      // Invoice details row
      doc.setFillColor(245, 245, 245);
      doc.rect(0, y - 5, pageWidth, 25, 'F');

      doc.setTextColor(...secondaryColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO:', 20, y);
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'normal');
      doc.text('Live-IN Properties', 20, y + 6);
      doc.text('liveinproperties2021@gmail.com', 20, y + 11);
      doc.text('Phone: 0746499499', 20, y + 16);

      doc.setTextColor(...secondaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE DETAILS:', pageWidth - 70, y);
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'normal');
      doc.text('Invoice #: INV-2026-001', pageWidth - 70, y + 6);
      doc.text('Date: January 23, 2026', pageWidth - 70, y + 11);
      doc.text('Valid Until: February 23, 2026', pageWidth - 70, y + 16);

      y += 30;

      // Project Title
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PROJECT: Real Estate Receipt Management System', 20, y);
      y += 10;

      // Table header
      doc.setFillColor(...primaryColor);
      doc.rect(15, y, pageWidth - 30, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('#', 18, y + 5.5);
      doc.text('Description', 28, y + 5.5);
      doc.text('Amount (KES)', pageWidth - 45, y + 5.5);
      y += 10;

      // Line items
      const items = [
        ['1', 'System Design & Architecture', '35,000'],
        ['2', 'Frontend Development (React.js, 15+ components)', '85,000'],
        ['3', 'Backend Development (PostgreSQL, APIs)', '75,000'],
        ['4', 'Authentication & Security (RLS, Roles)', '25,000'],
        ['5', 'PDF Generation Module', '20,000'],
        ['6', 'Payroll Module (PAYE, NHIF, NSSF, Housing Levy)', '40,000'],
        ['7', 'Accounting & Reports Module', '35,000'],
        ['8', 'Email Integration', '15,000'],
        ['9', 'Project & Plot Management', '25,000'],
        ['10', 'Testing & Quality Assurance', '20,000'],
        ['11', 'Deployment & Configuration', '15,000'],
        ['12', 'Documentation & Training', '10,000'],
      ];

      doc.setTextColor(...textColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      items.forEach((item, idx) => {
        const bgColor = idx % 2 === 0 ? [255, 255, 255] : [250, 250, 250];
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(15, y - 3, pageWidth - 30, 7, 'F');
        
        doc.text(item[0], 18, y + 2);
        doc.text(item[1], 28, y + 2);
        doc.text(item[2], pageWidth - 45, y + 2);
        y += 7;
      });

      // Totals
      y += 3;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.line(pageWidth - 90, y, pageWidth - 15, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', pageWidth - 90, y);
      doc.text('KES 400,000', pageWidth - 45, y);
      y += 6;

      doc.setTextColor(220, 53, 69);
      doc.text('Discount (10%):', pageWidth - 90, y);
      doc.text('(KES 40,000)', pageWidth - 45, y);
      y += 8;

      doc.setFillColor(...secondaryColor);
      doc.rect(pageWidth - 95, y - 5, 80, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('NET TOTAL:', pageWidth - 90, y + 1);
      doc.text('KES 360,000', pageWidth - 45, y + 1);
      y += 15;

      // Payment Terms
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT TERMS', 20, y);
      y += 7;

      doc.setTextColor(...textColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('• 50% Deposit: KES 180,000 (Upon acceptance)', 22, y); y += 5;
      doc.text('• 30% Milestone: KES 108,000 (Upon completion of core modules)', 22, y); y += 5;
      doc.text('• 20% Final: KES 72,000 (Upon deployment)', 22, y);
      y += 10;

      // What's Included
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("WHAT'S INCLUDED", 20, y);
      y += 7;

      const included = [
        '✓ Full source code ownership',
        '✓ Cloud hosting (first year included)',
        '✓ Custom domain setup',
        '✓ User training session',
        '✓ System documentation',
        '✓ 3 months post-launch support',
        '✓ Mobile-responsive design',
        '✓ Unlimited users',
      ];

      doc.setTextColor(...textColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      let col = 0;
      included.forEach((item, idx) => {
        const x = col === 0 ? 22 : 110;
        doc.text(item, x, y);
        col++;
        if (col >= 2) {
          col = 0;
          y += 5;
        }
      });

      y += 10;

      // Market Comparison
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('MARKET VALUE COMPARISON', 20, y);
      y += 7;

      doc.setFillColor(245, 245, 245);
      doc.rect(20, y - 3, pageWidth - 40, 20, 'F');
      
      doc.setTextColor(...mutedColor);
      doc.setFontSize(8);
      doc.text('Basic Receipt System: KES 50,000 - 100,000', 25, y + 2);
      doc.text('Standard Property Management: KES 150,000 - 250,000', 25, y + 7);
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text('Comprehensive System (This): KES 350,000 - 500,000', 25, y + 12);

      // Footer
      const footerY = pageHeight - 20;
      doc.setDrawColor(...secondaryColor);
      doc.setLineWidth(1);
      doc.line(20, footerY - 10, pageWidth - 20, footerY - 10);
      
      doc.setTextColor(...mutedColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Thank you for your business!', pageWidth / 2, footerY - 3, { align: 'center' });
      doc.text('Prices are estimates based on Kenya market rates for similar systems as of January 2026.', pageWidth / 2, footerY + 2, { align: 'center' });

      doc.save('LiveIN-Properties-Invoice-KES360000.pdf');
      toast.success('Invoice PDF downloaded!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">System Documentation</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* System Overview Card */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">System Overview</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete feature documentation
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>This document includes:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Executive summary</li>
                    <li>12 core feature modules</li>
                    <li>Technical specifications</li>
                    <li>Security features</li>
                    <li>Benefits overview</li>
                  </ul>
                </div>
                <Button 
                  onClick={generateSystemOverviewPDF}
                  disabled={generatingOverview}
                  className="w-full"
                  size="lg"
                >
                  {generatingOverview ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Card */}
          <Card className="border-2 border-secondary/20">
            <CardHeader className="bg-gradient-to-r from-secondary/10 to-secondary/5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-secondary/20 rounded-lg">
                  <Receipt className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Invoice / Quotation</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Professional pricing document
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-3xl font-bold text-primary">KES 360,000</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Market value: KES 350K - 500K
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Includes itemized breakdown, payment terms, and what's included.</p>
                </div>
                <Button 
                  onClick={generateInvoicePDF}
                  disabled={generatingInvoice}
                  className="w-full"
                  size="lg"
                  variant="secondary"
                >
                  {generatingInvoice ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg p-4 text-center border">
            <p className="text-2xl font-bold text-primary">12+</p>
            <p className="text-sm text-muted-foreground">Core Modules</p>
          </div>
          <div className="bg-card rounded-lg p-4 text-center border">
            <p className="text-2xl font-bold text-primary">Kenya</p>
            <p className="text-sm text-muted-foreground">Specific Payroll</p>
          </div>
          <div className="bg-card rounded-lg p-4 text-center border">
            <p className="text-2xl font-bold text-primary">Cloud</p>
            <p className="text-sm text-muted-foreground">Based System</p>
          </div>
          <div className="bg-card rounded-lg p-4 text-center border">
            <p className="text-2xl font-bold text-primary">Unlimited</p>
            <p className="text-sm text-muted-foreground">Users</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemDocs;
