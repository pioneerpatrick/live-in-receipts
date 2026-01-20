import { supabase } from '@/integrations/supabase/client';
import { sendActivityAlertEmail } from '@/lib/emailService';

export type ActivityAction = 
  | 'login'
  | 'logout'
  | 'client_created'
  | 'client_updated'
  | 'client_deleted'
  | 'payment_added'
  | 'payment_updated'
  | 'payment_deleted'
  | 'receipt_generated'
  | 'user_role_changed'
  | 'user_deleted'
  | 'password_reset'
  | 'excel_import'
  | 'database_backup';

export type EntityType = 'client' | 'payment' | 'user' | 'receipt' | 'system';

interface LogActivityParams {
  action: ActivityAction;
  entityType?: EntityType;
  entityId?: string;
  details?: Record<string, any>;
  sendEmailAlert?: boolean;
}

export const logActivity = async ({
  action,
  entityType,
  entityId,
  details,
  sendEmailAlert = true,
}: LogActivityParams): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log activity: No authenticated user');
      return;
    }

    // Get user's name from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const userName = profile?.full_name || user.email || 'Unknown User';

    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        user_name: userName,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      });

    if (error) {
      console.error('Failed to log activity:', error);
    }

    // Send email alert for significant activities (not login/logout to avoid spam)
    if (sendEmailAlert && !['login', 'logout'].includes(action)) {
      const detailsString = details ? JSON.stringify(details) : undefined;
      sendActivityAlertEmail(action, userName, entityType, detailsString).catch(err => {
        console.error('Failed to send activity alert email:', err);
      });
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

export const getActionLabel = (action: ActivityAction): string => {
  const labels: Record<ActivityAction, string> = {
    login: 'Logged in',
    logout: 'Logged out',
    client_created: 'Created client',
    client_updated: 'Updated client',
    client_deleted: 'Deleted client',
    payment_added: 'Added payment',
    payment_updated: 'Updated payment',
    payment_deleted: 'Deleted payment',
    receipt_generated: 'Generated receipt',
    user_role_changed: 'Changed user role',
    user_deleted: 'Deleted user',
    password_reset: 'Reset password',
    excel_import: 'Imported from Excel',
    database_backup: 'Created database backup',
  };
  return labels[action] || action;
};