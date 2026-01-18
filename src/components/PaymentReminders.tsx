import { Client } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { Bell, AlertTriangle, Clock, Calendar, MessageCircle, Copy, ExternalLink, Mail } from 'lucide-react';
import { format, differenceInDays, differenceInMonths, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentRemindersProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
}

interface ReminderClient extends Client {
  daysUntilDue: number;
  status: 'overdue' | 'due-today' | 'upcoming';
  timeDisplay: string;
}

const formatTimeDifference = (days: number): string => {
  const absDays = Math.abs(days);
  
  if (absDays === 0) return 'Today';
  if (absDays === 1) return days < 0 ? '1 day overdue' : 'In 1 day';
  if (absDays < 30) return days < 0 ? `${absDays} days overdue` : `In ${absDays} days`;
  
  const months = Math.floor(absDays / 30);
  const remainingDays = absDays % 30;
  
  if (months === 1) {
    if (remainingDays === 0) return days < 0 ? '1 month overdue' : 'In 1 month';
    return days < 0 ? `1 month, ${remainingDays}d overdue` : `In 1 month, ${remainingDays}d`;
  }
  
  if (remainingDays === 0) return days < 0 ? `${months} months overdue` : `In ${months} months`;
  return days < 0 ? `${months} months, ${remainingDays}d overdue` : `In ${months} months, ${remainingDays}d`;
};

const generateWhatsAppMessage = (client: Client, productionUrl: string | null): string => {
  const paymentLink = productionUrl ? `${productionUrl}/payments/${client.id}` : null;
  const monthlyContribution = client.installment_months && client.installment_months > 0 && client.balance > 0
    ? Math.ceil(client.balance / client.installment_months)
    : null;
  
  const message = `Dear ${client.name},

This is a friendly payment reminder from our team.

📋 *Payment Details:*
━━━━━━━━━━━━━━━━━
• Project: ${client.project_name}
• Plot Number: ${client.plot_number}
• Total Price: ${formatCurrency(client.total_price)}
• Amount Paid: ${formatCurrency(client.total_paid)}
• *Outstanding Balance: ${formatCurrency(client.balance)}*
${monthlyContribution ? `• *Monthly Contribution: ${formatCurrency(monthlyContribution)}*` : ''}
${client.next_payment_date ? `• Due Date: ${format(parseISO(client.next_payment_date), 'dd MMM yyyy')}` : ''}
${client.installment_months ? `• Payment Plan: ${client.installment_months} months` : ''}
${paymentLink ? `\n🔗 *View Payment History:*\n${paymentLink}` : ''}

We kindly request you to clear the outstanding balance at your earliest convenience.

For any queries, please don't hesitate to contact us.

Thank you for your continued trust.

Best regards,
*Property Management Team*`;

  return message;
};

const generateEmailMessage = (client: Client, productionUrl: string | null): { subject: string; body: string } => {
  const paymentLink = productionUrl ? `${productionUrl}/payments/${client.id}` : null;
  const monthlyContribution = client.installment_months && client.installment_months > 0 && client.balance > 0
    ? Math.ceil(client.balance / client.installment_months)
    : null;
  
  const subject = `Payment Reminder - ${client.project_name} Plot ${client.plot_number}`;
  
  const body = `Dear ${client.name},

This is a friendly payment reminder from our team.

PAYMENT DETAILS:
─────────────────────────────
• Project: ${client.project_name}
• Plot Number: ${client.plot_number}
• Total Price: ${formatCurrency(client.total_price)}
• Amount Paid: ${formatCurrency(client.total_paid)}
• Outstanding Balance: ${formatCurrency(client.balance)}
${monthlyContribution ? `• Monthly Contribution: ${formatCurrency(monthlyContribution)}` : ''}
${client.next_payment_date ? `• Due Date: ${format(parseISO(client.next_payment_date), 'dd MMM yyyy')}` : ''}
${client.installment_months ? `• Payment Plan: ${client.installment_months} months` : ''}
${paymentLink ? `\nView Payment History: ${paymentLink}` : ''}

We kindly request you to clear the outstanding balance at your earliest convenience.

For any queries, please don't hesitate to contact us.

Thank you for your continued trust.

Best regards,
Property Management Team`;

  return { subject, body };
};

const getFormattedPhone = (phone: string): string => {
  // Clean phone number - remove spaces, dashes, and ensure it starts with country code
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // If phone doesn't start with +, assume Kenya (+254)
  if (!cleanPhone.startsWith('+')) {
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('254')) {
      cleanPhone = '254' + cleanPhone;
    }
  } else {
    cleanPhone = cleanPhone.substring(1); // Remove the + for URL
  }
  
  return cleanPhone;
};

export const PaymentReminders = ({ clients, onSelectClient }: PaymentRemindersProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [whatsappDialog, setWhatsappDialog] = useState<{ open: boolean; client: Client | null }>({
    open: false,
    client: null
  });
  
  const [emailDialog, setEmailDialog] = useState<{ open: boolean; client: Client | null }>({
    open: false,
    client: null
  });
  
  const [productionUrl, setProductionUrl] = useState<string | null>(null);

  // Fetch production URL from company settings
  useEffect(() => {
    const fetchProductionUrl = async () => {
      const { data } = await supabase
        .from('company_settings')
        .select('production_url')
        .maybeSingle();
      
      if (data?.production_url) {
        setProductionUrl(data.production_url);
      }
    };
    
    fetchProductionUrl();
  }, []);

  const handleWhatsAppClick = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!client.phone) {
      toast.error('No phone number available for this client');
      return;
    }
    
    setWhatsappDialog({ open: true, client });
  };

  const copyMessage = async () => {
    if (!whatsappDialog.client) return;
    
    const message = generateWhatsAppMessage(whatsappDialog.client, productionUrl);
    await navigator.clipboard.writeText(message);
    toast.success('Message copied to clipboard!');
  };

  const getWhatsAppUrl = (useWebVersion: boolean = false) => {
    if (!whatsappDialog.client?.phone) return '';
    
    const phone = getFormattedPhone(whatsappDialog.client.phone);
    const message = encodeURIComponent(generateWhatsAppMessage(whatsappDialog.client, productionUrl));
    
    // wa.me works on mobile and desktop, web.whatsapp.com is desktop-only
    return useWebVersion 
      ? `https://web.whatsapp.com/send?phone=${phone}&text=${message}`
      : `https://wa.me/${phone}?text=${message}`;
  };

  const copyWhatsAppLink = async (useWebVersion: boolean = false) => {
    const link = getWhatsAppUrl(useWebVersion);
    if (!link) return;
    
    await navigator.clipboard.writeText(link);
    toast.success(`WhatsApp link copied! Paste in a new browser tab.`);
  };

  const openWhatsAppDirect = (useWebVersion: boolean = false) => {
    const link = getWhatsAppUrl(useWebVersion);
    if (!link) return;
    
    // Use window.open for better compatibility
    const newWindow = window.open(link, '_blank', 'noopener,noreferrer');
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Popup was blocked, show instructions
      toast.info('Popup blocked. Click "Copy Link" and paste in a new tab.');
    }
  };

  const handleEmailClick = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmailDialog({ open: true, client });
  };

  const getEmailUrl = () => {
    if (!emailDialog.client) return '';
    
    const { subject, body } = generateEmailMessage(emailDialog.client, productionUrl);
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const copyEmailMessage = async () => {
    if (!emailDialog.client) return;
    
    const { body } = generateEmailMessage(emailDialog.client, productionUrl);
    await navigator.clipboard.writeText(body);
    toast.success('Email message copied to clipboard!');
  };

  const copyEmailSubject = async () => {
    if (!emailDialog.client) return;
    
    const { subject } = generateEmailMessage(emailDialog.client, productionUrl);
    await navigator.clipboard.writeText(subject);
    toast.success('Email subject copied to clipboard!');
  };

  const openEmailClient = () => {
    const link = getEmailUrl();
    if (!link) return;
    
    try {
      // Try window.open first for better iframe compatibility
      const newWindow = window.open(link, '_self');
      
      if (!newWindow) {
        // Fallback: try location.href
        window.location.href = link;
      }
      toast.success('Opening email client...');
    } catch (error) {
      // If blocked in preview, show instructions
      toast.info('Email client blocked in preview. Copy the message and paste in your email app, or test on the published app.');
    }
  };

  const copyEmailLink = async () => {
    const link = getEmailUrl();
    if (!link) return;
    
    await navigator.clipboard.writeText(link);
    toast.success('Email link copied! Paste in browser address bar.');
  };

  const getReminders = (): ReminderClient[] => {
    return clients
      .filter(client => {
        // Exclude cancelled clients from reminders
        if (client.status === 'cancelled') return false;
        // Show clients with outstanding balance
        if (client.balance <= 0) return false;
        return true;
      })
      .map(client => {
        let daysUntilDue: number;
        let status: 'overdue' | 'due-today' | 'upcoming';
        
        if (client.next_payment_date) {
          const paymentDate = parseISO(client.next_payment_date);
          if (!isValid(paymentDate)) {
            // If date is invalid, treat as overdue
            daysUntilDue = -30;
            status = 'overdue';
          } else {
            daysUntilDue = differenceInDays(paymentDate, today);
            if (daysUntilDue < 0) {
              status = 'overdue';
            } else if (daysUntilDue === 0) {
              status = 'due-today';
            } else {
              status = 'upcoming';
            }
          }
        } else {
          // No payment date set - show as needing attention (treat as upcoming)
          daysUntilDue = 0;
          status = 'due-today';
        }
        
        return {
          ...client,
          daysUntilDue,
          status,
          timeDisplay: formatTimeDifference(daysUntilDue)
        } as ReminderClient;
      })
      .filter((client): client is ReminderClient => client !== null)
      // Show ALL overdue clients (negative days) and upcoming within 60 days
      .filter(client => client.status === 'overdue' || client.daysUntilDue <= 60)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  };

  const reminders = getReminders();
  const overdueCount = reminders.filter(r => r.status === 'overdue').length;
  const dueTodayCount = reminders.filter(r => r.status === 'due-today').length;
  const upcomingCount = reminders.filter(r => r.status === 'upcoming').length;

  if (reminders.length === 0) {
    return (
      <div className="bg-card rounded-lg p-4 sm:p-6 card-shadow animate-fade-in">
        <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Payment Reminders
        </h3>
        <div className="text-center py-6 sm:py-8 text-muted-foreground">
          <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm sm:text-base">All payments are up to date!</p>
          <p className="text-xs mt-1">No outstanding balances found</p>
        </div>
      </div>
    );
  }

  const getStatusStyles = (status: ReminderClient['status']) => {
    switch (status) {
      case 'overdue':
        return {
          bg: 'bg-destructive/10',
          border: 'border-destructive/30',
          text: 'text-destructive',
          icon: AlertTriangle,
          label: 'Overdue'
        };
      case 'due-today':
        return {
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          text: 'text-orange-600',
          icon: Clock,
          label: 'Due Today'
        };
      case 'upcoming':
        return {
          bg: 'bg-primary/10',
          border: 'border-primary/30',
          text: 'text-primary',
          icon: Calendar,
          label: 'Upcoming'
        };
    }
  };

  return (
    <>
      <div className="bg-card rounded-lg p-4 sm:p-6 card-shadow animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
          <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Payment Reminders
          </h3>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
            {overdueCount > 0 && (
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-destructive/10 text-destructive rounded-full font-medium">
                {overdueCount} overdue
              </span>
            )}
            {dueTodayCount > 0 && (
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-orange-500/10 text-orange-600 rounded-full font-medium">
                {dueTodayCount} due today
              </span>
            )}
            {upcomingCount > 0 && (
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/10 text-primary rounded-full font-medium">
                {upcomingCount} upcoming
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
          {reminders.map(reminder => {
            const styles = getStatusStyles(reminder.status);
            const IconComponent = styles.icon;
            
            return (
              <div
                key={reminder.id}
                onClick={() => onSelectClient(reminder)}
                className={`p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${styles.bg} ${styles.border}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className={`p-1 sm:p-1.5 rounded-full ${styles.bg} flex-shrink-0`}>
                      <IconComponent className={`w-3 h-3 sm:w-4 sm:h-4 ${styles.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-sm sm:text-base truncate">{reminder.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {reminder.project_name} - Plot {reminder.plot_number}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                        {reminder.next_payment_date && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Due: {format(parseISO(reminder.next_payment_date), 'dd MMM yyyy')}
                          </p>
                        )}
                        <span className={`text-[10px] sm:text-xs font-semibold ${styles.text}`}>
                          • {reminder.timeDisplay}
                        </span>
                      </div>
                      {/* Monthly contribution info */}
                      {reminder.installment_months && reminder.installment_months > 0 && reminder.balance > 0 && (
                        <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Monthly: {formatCurrency(Math.ceil(reminder.balance / reminder.installment_months))}
                          </span>
                          <span className="mx-1">•</span>
                          <span>{reminder.installment_months} months plan</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Total Due</p>
                      <p className={`font-bold text-sm sm:text-base ${styles.text}`}>
                        {formatCurrency(reminder.balance)}
                      </p>
                      <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${styles.bg} ${styles.text} font-medium`}>
                        {styles.label}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleWhatsAppClick(reminder, e)}
                        className="h-7 sm:h-8 px-2 sm:px-3 gap-1 text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
                      >
                        <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline text-[10px] sm:text-xs">WhatsApp</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleEmailClick(reminder, e)}
                        className="h-7 sm:h-8 px-2 sm:px-3 gap-1 text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline text-[10px] sm:text-xs">Email</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WhatsApp Dialog */}
      <Dialog open={whatsappDialog.open} onOpenChange={(open) => setWhatsappDialog({ open, client: open ? whatsappDialog.client : null })}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <MessageCircle className="w-5 h-5" />
              Send WhatsApp Reminder
            </DialogTitle>
          </DialogHeader>
          
          {whatsappDialog.client && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{whatsappDialog.client.name}</p>
                <p className="text-xs text-muted-foreground">{whatsappDialog.client.phone}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Balance: <span className="font-semibold text-destructive">{formatCurrency(whatsappDialog.client.balance)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Message Preview:</p>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg max-h-40 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-sans text-green-800">
                    {generateWhatsAppMessage(whatsappDialog.client, productionUrl)}
                  </pre>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => openWhatsAppDirect(false)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open WhatsApp
                  </Button>
                  <Button
                    onClick={() => openWhatsAppDirect(true)}
                    variant="outline"
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    WhatsApp Web
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => copyWhatsAppLink(false)}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={copyMessage}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Message
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-2">
                  ⚠️ Links may be blocked in preview. Use <span className="font-medium">Copy Link</span> and paste in a new tab, or test on the published app.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialog.open} onOpenChange={(open) => setEmailDialog({ open, client: open ? emailDialog.client : null })}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Mail className="w-5 h-5" />
              Send Email Reminder
            </DialogTitle>
          </DialogHeader>
          
          {emailDialog.client && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{emailDialog.client.name}</p>
                <p className="text-xs text-muted-foreground">
                  {emailDialog.client.project_name} - Plot {emailDialog.client.plot_number}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Balance: <span className="font-semibold text-destructive">{formatCurrency(emailDialog.client.balance)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Subject:</p>
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    {generateEmailMessage(emailDialog.client, productionUrl).subject}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Message Preview:</p>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg max-h-40 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-sans text-blue-800">
                    {generateEmailMessage(emailDialog.client, productionUrl).body}
                  </pre>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={openEmailClient}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Open Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={copyEmailLink}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={copyEmailSubject}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Subject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={copyEmailMessage}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Message
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-2">
                  ⚠️ If "Open Email" doesn't work, use <span className="font-medium">Copy Link</span> and paste in browser, or copy the message manually. Test on the published app for best results.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
