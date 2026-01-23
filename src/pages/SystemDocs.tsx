import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, Receipt, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const SystemDocs = () => {
  const downloadAsText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const systemOverview = `
LIVE-IN PROPERTIES RECEIPT MANAGEMENT SYSTEM
System Overview & Feature Documentation
=============================================

Company Information
-------------------
Live-IN Properties
"Genuine plots with ready title deeds"

Email: liveinproperties2021@gmail.com
Phone: 0746499499
Website: live-inproperties.co.ke

EXECUTIVE SUMMARY
-----------------
The Live-IN Properties Receipt Management System is a comprehensive, cloud-based 
real estate management platform designed specifically for property sales companies 
in Kenya. The system streamlines client management, payment tracking, receipt 
generation, and financial reporting into a single, intuitive interface.

CORE FEATURES
=============

1. CLIENT MANAGEMENT
--------------------
• Client Database: Centralized storage for all client records
• Multi-Plot Support: Handle clients purchasing multiple plots in a single transaction
• Status Tracking: Monitor client payment status (Ongoing, Completed, Cancelled)
• Sales Agent Assignment: Track which agent handles each sale
• Contact Management: Store phone numbers and email addresses

2. PAYMENT PROCESSING
---------------------
• Installment Tracking: Smart calculation of balances and payment progress
• Multiple Payment Methods: Cash, M-Pesa, Bank Transfer, Cheque support
• Payment History: Complete audit trail of all transactions
• Automatic Balance Updates: Real-time balance recalculation
• Payment Reminders: Automated tracking of overdue payments

3. RECEIPT GENERATION
---------------------
• Professional PDF Receipts: Branded, printable receipts with company logo
• QR Code Integration: Scannable codes linking to payment history
• Auto-numbering: Sequential receipt number generation
• Digital Signatures: Signature support on receipts
• Payment History Statements: Generate complete payment history documents

4. PROJECT & PLOT MANAGEMENT
----------------------------
• Project Creation: Define multiple real estate projects
• Plot Inventory: Track individual plots with sizes and prices
• Status Tracking: Available, Sold, Reserved status management
• Bulk Plot Creation: Add multiple plots at once
• Visual Dashboard: Inventory overview with statistics

5. FINANCIAL REPORTING
----------------------
• Accounting Dashboard: Real-time financial metrics
• Revenue Charts: Visual representation of income
• Profit & Loss Statements: Comprehensive P&L reports
• General Ledger: Complete transaction records
• Excel Export: Download reports in spreadsheet format
• PDF Export: Generate printable financial reports

6. EXPENSE MANAGEMENT
---------------------
• Expense Tracking: Record and categorize all expenses
• Commission Reports: Track sales agent commissions
• Category Management: Organize expenses by type
• Receipt Uploads: Attach supporting documents

7. PAYROLL PROCESSING (KENYA-SPECIFIC)
--------------------------------------
• PAYE Calculation: Automatic tax computation per KRA rates
• NHIF Deductions: National Health Insurance calculations
• NSSF Contributions: Social security fund management
• Housing Levy: 1.5% housing levy computation
• Payslip Generation: Professional payslip PDFs
• P9 Forms: Annual tax return forms

8. USER MANAGEMENT & SECURITY
-----------------------------
• Role-Based Access: Admin and Staff permission levels
• User Authentication: Secure login with email verification
• Activity Logging: Complete audit trail of all actions
• Password Reset: Self-service password recovery
• User Administration: Add, edit, and remove system users

9. DATA IMPORT/EXPORT
---------------------
• Excel Import: Bulk client data upload
• Payment History Import: Import existing payment records
• Database Backup: Scheduled and manual backups
• Data Export: Export all data in various formats

10. EMAIL NOTIFICATIONS
-----------------------
• Payment Confirmations: Automatic receipt emails
• Reminder Notifications: Payment due date alerts
• Account Updates: Client information change notifications
• Admin Alerts: Important system notifications

11. ANALYTICS & INSIGHTS
------------------------
• Dashboard Metrics: Key performance indicators
• Revenue Analysis: Income trends and projections
• Client Statistics: Portfolio analysis
• Project Performance: Per-project metrics

TECHNICAL SPECIFICATIONS
========================
Component          | Technology
-------------------|------------------
Frontend           | React.js with TypeScript
Styling            | Tailwind CSS
Backend            | Supabase (PostgreSQL)
Authentication     | Supabase Auth
File Storage       | Supabase Storage
PDF Generation     | jsPDF
Email Service      | Resend API
Hosting            | Cloud-based (Lovable)

SECURITY FEATURES
=================
✓ Row Level Security (RLS) on all database tables
✓ Encrypted data transmission (HTTPS)
✓ Secure authentication with session management
✓ Role-based access control
✓ Activity logging and audit trails
✓ Secure password handling

BENEFITS
========
1. Time Savings: Automate receipt generation and calculations
2. Accuracy: Eliminate manual calculation errors
3. Accessibility: Access from anywhere with internet
4. Professionalism: Branded, consistent documentation
5. Compliance: Kenya-specific tax and statutory calculations
6. Scalability: Handle growing client base efficiently
7. Data Security: Cloud backup and protection

SUPPORT & MAINTENANCE
=====================
• Regular system updates
• Bug fixes and improvements
• Email support
• User training documentation

=============================================
Thank you for choosing Live-IN Properties. 
We Secure your Future.
=============================================

Document Version: 1.0
Last Updated: January 2026
`;

  const invoice = `
INVOICE / QUOTATION
===================

Developer Information
---------------------
Technopanaly Solutions
Software Development & IT Consulting
Nairobi, Kenya

Client Information
------------------
Live-IN Properties
Email: liveinproperties2021@gmail.com
Phone: 0746499499
Website: live-inproperties.co.ke

Invoice Number: INV-2026-001
Date: January 23, 2026
Valid Until: February 23, 2026

PROJECT: Real Estate Receipt Management System
===============================================

ITEMIZED BREAKDOWN
------------------

#  | Description                        | Unit Price (KES) | Total (KES)
---|------------------------------------|-----------------:|------------:
1  | System Design & Architecture       |           35,000 |      35,000
   | - Requirements analysis            |                  |
   | - Database schema design           |                  |
   | - UI/UX wireframing                |                  |
2  | Frontend Development               |           85,000 |      85,000
   | - React.js application             |                  |
   | - Responsive design                |                  |
   | - 15+ major components             |                  |
3  | Backend Development                |           75,000 |      75,000
   | - Database setup (PostgreSQL)      |                  |
   | - API integrations                 |                  |
   | - Edge functions                   |                  |
4  | Authentication & Security          |           25,000 |      25,000
   | - User authentication              |                  |
   | - Role-based access control        |                  |
   | - Row Level Security               |                  |
5  | PDF Generation Module              |           20,000 |      20,000
   | - Receipt generator                |                  |
   | - Payment history reports          |                  |
   | - Branded templates                |                  |
6  | Payroll Module (Kenya-Specific)    |           40,000 |      40,000
   | - PAYE calculations                |                  |
   | - NHIF/NSSF/Housing Levy           |                  |
   | - Payslip & P9 generation          |                  |
7  | Accounting & Reports Module        |           35,000 |      35,000
   | - Financial dashboards             |                  |
   | - P&L statements                   |                  |
   | - Excel/PDF exports                |                  |
8  | Email Integration                  |           15,000 |      15,000
   | - Payment notifications            |                  |
   | - Reminder system                  |                  |
9  | Project & Plot Management          |           25,000 |      25,000
   | - Inventory tracking               |                  |
   | - Plot status management           |                  |
10 | Testing & Quality Assurance        |           20,000 |      20,000
11 | Deployment & Configuration         |           15,000 |      15,000
12 | Documentation & Training           |           10,000 |      10,000
---|------------------------------------|-----------------:|------------:
                                        |     SUBTOTAL     |     400,000
                                        |  DISCOUNT (10%)  |     (40,000)
                                        |------------------|------------:
                                        |    NET AMOUNT    |     360,000

ANNUAL MAINTENANCE (Optional)
-----------------------------
Service                          | Annual Cost (KES)
---------------------------------|------------------:
System Updates & Bug Fixes       |            36,000
Cloud Hosting (Included 1st yr)  |            24,000
Email Support                    |            12,000
---------------------------------|------------------:
Total Annual Maintenance         |            72,000

PAYMENT TERMS
-------------
• 50% Deposit:    KES 180,000 (Upon acceptance)
• 30% Milestone:  KES 108,000 (Upon completion of core modules)
• 20% Final:      KES  72,000 (Upon deployment)

WHAT'S INCLUDED
---------------
✓ Full source code ownership
✓ Cloud hosting (first year included)
✓ Custom domain setup
✓ User training session
✓ System documentation
✓ 3 months post-launch support
✓ Mobile-responsive design
✓ Unlimited users

MARKET VALUE COMPARISON
-----------------------
System Type                      | Market Price Range (KES)
---------------------------------|-------------------------
Basic Receipt System             |        50,000 - 100,000
Standard Property Management     |       150,000 - 250,000
Comprehensive System (This)      |       350,000 - 500,000
Enterprise Solutions             |               800,000+

This quotation represents excellent value for a fully-featured, 
custom-built system.

ACCEPTANCE
----------
By signing below, you agree to the terms of this quotation:

Client Signature: _________________________

Date: _________________________

Name: _________________________

===============================================
Thank you for your business!
===============================================

Note: This is a quotation for a custom software development project. 
Prices are estimates based on Kenya market rates for similar systems 
as of January 2026.
`;

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

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              System Overview
            </TabsTrigger>
            <TabsTrigger value="invoice" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Invoice/Quote
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>System Overview & Features</CardTitle>
                <Button 
                  onClick={() => downloadAsText(systemOverview, 'LiveIN-Properties-System-Overview.txt')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                  {systemOverview}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Invoice / Quotation - KES 360,000</CardTitle>
                <Button 
                  onClick={() => downloadAsText(invoice, 'LiveIN-Properties-Invoice-KES360000.txt')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                  {invoice}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SystemDocs;
