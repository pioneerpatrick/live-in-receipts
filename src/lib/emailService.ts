import { supabase } from '@/integrations/supabase/client';

interface EmailData {
  type: 'client_update' | 'payment_update' | 'payment_reminder' | 'activity_alert' | 'staff_welcome' | 'payment_added';
  recipient?: string;
  data: Record<string, unknown>;
}

export const sendEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: emailData,
    });

    if (error) {
      console.error('Error sending email:', error);
      return false;
    }

    if (data?.skipped) {
      console.log('Email skipped:', data.message);
      return true;
    }

    console.log('Email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error invoking email function:', error);
    return false;
  }
};

export const sendClientUpdateEmail = async (
  clientEmail: string | undefined,
  clientName: string,
  projectName: string,
  plotNumber: string,
  changes?: string
): Promise<void> => {
  if (!clientEmail) return;

  await sendEmail({
    type: 'client_update',
    recipient: clientEmail,
    data: {
      clientName,
      projectName,
      plotNumber,
      changes,
    },
  });
};

export const sendPaymentAddedEmail = async (
  clientEmail: string | undefined,
  data: {
    clientName: string;
    projectName: string;
    plotNumber: string;
    amount: number;
    receiptNumber: string;
    newBalance: number;
    totalPaid: number;
    paymentMethod: string;
  }
): Promise<void> => {
  if (!clientEmail) return;

  await sendEmail({
    type: 'payment_added',
    recipient: clientEmail,
    data,
  });
};

export const sendPaymentUpdateEmail = async (
  clientEmail: string | undefined,
  data: {
    clientName: string;
    projectName: string;
    plotNumber: string;
    receiptNumber: string;
    oldAmount: number;
    newAmount: number;
    newBalance: number;
  }
): Promise<void> => {
  if (!clientEmail) return;

  await sendEmail({
    type: 'payment_update',
    recipient: clientEmail,
    data,
  });
};

export const sendPaymentReminderEmail = async (
  clientEmail: string,
  data: {
    clientName: string;
    projectName: string;
    plotNumber: string;
    balance: number;
    dueDate?: string;
    monthlyContribution?: number;
    isOverdue: boolean;
  }
): Promise<void> => {
  await sendEmail({
    type: 'payment_reminder',
    recipient: clientEmail,
    data,
  });
};

export const sendActivityAlertEmail = async (
  action: string,
  userName: string,
  entityType?: string,
  details?: string
): Promise<void> => {
  await sendEmail({
    type: 'activity_alert',
    data: {
      action,
      userName,
      entityType,
      details,
      timestamp: new Date().toLocaleString(),
    },
  });
};

export const sendStaffWelcomeEmail = async (
  email: string,
  fullName: string,
  tempPassword: string,
  loginUrl: string
): Promise<void> => {
  await sendEmail({
    type: 'staff_welcome',
    recipient: email,
    data: {
      fullName,
      email,
      tempPassword,
      loginUrl,
    },
  });
};
