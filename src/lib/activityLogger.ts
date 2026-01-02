import { supabase } from '@/integrations/supabase/client';

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
  | 'excel_import';

export type EntityType = 'client' | 'payment' | 'user' | 'receipt';

interface LogActivityParams {
  action: ActivityAction;
  entityType?: EntityType;
  entityId?: string;
  details?: Record<string, any>;
}

export const logActivity = async ({
  action,
  entityType,
  entityId,
  details,
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

    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        user_name: profile?.full_name || user.email,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      });

    if (error) {
      console.error('Failed to log activity:', error);
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
    excel_import: 'Imported from Excel',
  };
  return labels[action] || action;
};