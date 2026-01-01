import { Client } from '@/types/client';
import { formatCurrency } from '@/lib/supabaseStorage';
import { Bell, AlertTriangle, Clock, Calendar } from 'lucide-react';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';

interface PaymentRemindersProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
}

interface ReminderClient extends Client {
  daysUntilDue: number;
  status: 'overdue' | 'due-today' | 'upcoming';
}

export const PaymentReminders = ({ clients, onSelectClient }: PaymentRemindersProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getReminders = (): ReminderClient[] => {
    return clients
      .filter(client => {
        if (!client.next_payment_date || client.balance <= 0) return false;
        return true;
      })
      .map(client => {
        const paymentDate = parseISO(client.next_payment_date!);
        if (!isValid(paymentDate)) return null;
        
        const daysUntilDue = differenceInDays(paymentDate, today);
        
        let status: 'overdue' | 'due-today' | 'upcoming';
        if (daysUntilDue < 0) {
          status = 'overdue';
        } else if (daysUntilDue === 0) {
          status = 'due-today';
        } else {
          status = 'upcoming';
        }
        
        return {
          ...client,
          daysUntilDue,
          status
        } as ReminderClient;
      })
      .filter((client): client is ReminderClient => client !== null)
      .filter(client => client.daysUntilDue <= 7) // Show reminders for next 7 days and overdue
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
          <p className="text-sm sm:text-base">No upcoming payment reminders</p>
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

      <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto">
        {reminders.map(reminder => {
          const styles = getStatusStyles(reminder.status);
          const IconComponent = styles.icon;
          
          return (
            <div
              key={reminder.id}
              onClick={() => onSelectClient(reminder)}
              className={`p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`p-1 sm:p-1.5 rounded-full ${styles.bg} flex-shrink-0`}>
                    <IconComponent className={`w-3 h-3 sm:w-4 sm:h-4 ${styles.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm sm:text-base truncate">{reminder.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {reminder.project_name} - Plot {reminder.plot_number}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                      {reminder.next_payment_date && (
                        <>
                          Due: {format(parseISO(reminder.next_payment_date), 'dd MMM yyyy')}
                          {reminder.status === 'overdue' && (
                            <span className={`ml-1 sm:ml-2 font-medium ${styles.text}`}>
                              ({Math.abs(reminder.daysUntilDue)}d late)
                            </span>
                          )}
                          {reminder.status === 'upcoming' && (
                            <span className={`ml-1 sm:ml-2 font-medium ${styles.text}`}>
                              (in {reminder.daysUntilDue}d)
                            </span>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-sm sm:text-base ${styles.text}`}>
                    {formatCurrency(reminder.balance)}
                  </p>
                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${styles.bg} ${styles.text} font-medium`}>
                    {styles.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
