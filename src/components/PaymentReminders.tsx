import { Client } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { Bell, AlertTriangle, Clock, Calendar, MessageCircle } from 'lucide-react';
import { format, differenceInDays, differenceInMonths, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';

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

const generateWhatsAppMessage = (client: Client): string => {
  const message = `Dear ${client.name},

This is a friendly payment reminder from our team.

📋 *Payment Details:*
━━━━━━━━━━━━━━━━━
• Project: ${client.project_name}
• Plot Number: ${client.plot_number}
• Total Price: ${formatCurrency(client.total_price)}
• Amount Paid: ${formatCurrency(client.total_paid)}
• *Outstanding Balance: ${formatCurrency(client.balance)}*
${client.next_payment_date ? `• Due Date: ${format(parseISO(client.next_payment_date), 'dd MMM yyyy')}` : ''}

We kindly request you to clear the outstanding balance at your earliest convenience.

For any queries, please don't hesitate to contact us.

Thank you for your continued trust.

Best regards,
*Property Management Team*`;

  return encodeURIComponent(message);
};

const openWhatsApp = (client: Client, e: React.MouseEvent) => {
  e.stopPropagation();
  
  if (!client.phone) {
    alert('No phone number available for this client');
    return;
  }
  
  // Clean phone number - remove spaces, dashes, and ensure it starts with country code
  let phone = client.phone.replace(/[\s\-\(\)]/g, '');
  
  // If phone doesn't start with +, assume Kenya (+254)
  if (!phone.startsWith('+')) {
    if (phone.startsWith('0')) {
      phone = '254' + phone.substring(1);
    } else if (!phone.startsWith('254')) {
      phone = '254' + phone;
    }
  } else {
    phone = phone.substring(1); // Remove the + for URL
  }
  
  const message = generateWhatsAppMessage(client);
  const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
  
  window.open(whatsappUrl, '_blank');
};

export const PaymentReminders = ({ clients, onSelectClient }: PaymentRemindersProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
      // Show all overdue and upcoming within 60 days
      .filter(client => client.daysUntilDue <= 60)
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
                  </div>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className={`font-bold text-sm sm:text-base ${styles.text}`}>
                      {formatCurrency(reminder.balance)}
                    </p>
                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${styles.bg} ${styles.text} font-medium`}>
                      {styles.label}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => openWhatsApp(reminder, e)}
                    className="h-7 sm:h-8 px-2 sm:px-3 gap-1 text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
                  >
                    <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-xs">WhatsApp</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
