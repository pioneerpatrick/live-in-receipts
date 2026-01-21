import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'client_update' | 'payment_update' | 'payment_reminder' | 'activity_alert' | 'staff_welcome' | 'payment_added' | 'user_deleted';
  recipient?: string;
  data: Record<string, unknown>;
}

async function sendEmail(
  resendApiKey: string,
  to: string[],
  subject: string,
  html: string
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "Live-IN Properties <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Resend API error: ${errorData}`);
  }

  return await response.json();
}

function generateClientUpdateEmail(data: Record<string, unknown>): { subject: string; html: string } {
  const clientName = data.clientName as string;
  const projectName = data.projectName as string;
  const plotNumber = data.plotNumber as string;
  const changes = data.changes as string;
  
  return {
    subject: `Account Update - ${projectName} Plot ${plotNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">📋 Account Update Notification</h2>
        <p>Dear ${clientName},</p>
        <p>Your account details have been updated in our system.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Property Details:</h3>
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Plot Number:</strong> ${plotNumber}</p>
          ${changes ? `<p><strong>Changes:</strong> ${changes}</p>` : ''}
        </div>
        <p>If you have any questions about these changes, please don't hesitate to contact us.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Best regards,<br/>
          <strong>Live-IN Properties</strong><br/>
          Genuine plots with ready title deeds
        </p>
      </div>
    `,
  };
}

function generatePaymentAddedEmail(data: Record<string, unknown>): { subject: string; html: string } {
  const clientName = data.clientName as string;
  const projectName = data.projectName as string;
  const plotNumber = data.plotNumber as string;
  const amount = data.amount as number;
  const receiptNumber = data.receiptNumber as string;
  const newBalance = data.newBalance as number;
  const totalPaid = data.totalPaid as number;
  const paymentMethod = data.paymentMethod as string;
  
  const formatCurrency = (amt: number) => `KES ${amt.toLocaleString()}`;
  
  return {
    subject: `Payment Received - Receipt ${receiptNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">✅ Payment Received</h2>
        <p>Dear ${clientName},</p>
        <p>We have received your payment. Thank you for your continued trust!</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Receipt Number</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${receiptNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Project</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${projectName}</td>
          </tr>
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Plot Number</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${plotNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Amount Paid</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #10b981; font-weight: bold;">${formatCurrency(amount)}</td>
          </tr>
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Payment Method</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Total Paid to Date</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatCurrency(totalPaid)}</td>
          </tr>
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Outstanding Balance</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: ${newBalance > 0 ? '#ef4444' : '#10b981'}; font-weight: bold;">${formatCurrency(newBalance)}</td>
          </tr>
        </table>
        ${newBalance === 0 ? '<p style="color: #10b981; font-weight: bold;">🎉 Congratulations! Your property is now fully paid!</p>' : ''}
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Best regards,<br/>
          <strong>Live-IN Properties</strong><br/>
          Genuine plots with ready title deeds
        </p>
      </div>
    `,
  };
}

function generatePaymentUpdateEmail(data: Record<string, unknown>): { subject: string; html: string } {
  const clientName = data.clientName as string;
  const projectName = data.projectName as string;
  const plotNumber = data.plotNumber as string;
  const receiptNumber = data.receiptNumber as string;
  const oldAmount = data.oldAmount as number;
  const newAmount = data.newAmount as number;
  const newBalance = data.newBalance as number;
  
  const formatCurrency = (amt: number) => `KES ${amt.toLocaleString()}`;
  
  return {
    subject: `Payment Updated - Receipt ${receiptNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">📝 Payment Update Notification</h2>
        <p>Dear ${clientName},</p>
        <p>A payment record has been updated in your account.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Receipt Number</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${receiptNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Project</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${projectName}</td>
          </tr>
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Plot Number</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${plotNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Previous Amount</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatCurrency(oldAmount)}</td>
          </tr>
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>New Amount</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #10b981; font-weight: bold;">${formatCurrency(newAmount)}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Current Balance</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatCurrency(newBalance)}</td>
          </tr>
        </table>
        <p>If you have any questions about this update, please contact us.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Best regards,<br/>
          <strong>Live-IN Properties</strong><br/>
          Genuine plots with ready title deeds
        </p>
      </div>
    `,
  };
}

function generatePaymentReminderEmail(data: Record<string, unknown>): { subject: string; html: string } {
  const clientName = data.clientName as string;
  const projectName = data.projectName as string;
  const plotNumber = data.plotNumber as string;
  const balance = data.balance as number;
  const dueDate = data.dueDate as string;
  const monthlyContribution = data.monthlyContribution as number;
  const isOverdue = data.isOverdue as boolean;
  
  const formatCurrency = (amt: number) => `KES ${amt.toLocaleString()}`;
  
  return {
    subject: isOverdue 
      ? `⚠️ Overdue Payment Reminder - ${projectName} Plot ${plotNumber}`
      : `Payment Reminder - ${projectName} Plot ${plotNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isOverdue ? '#ef4444' : '#f59e0b'};">
          ${isOverdue ? '⚠️ Overdue Payment Reminder' : '📅 Payment Reminder'}
        </h2>
        <p>Dear ${clientName},</p>
        <p>This is a friendly reminder about your ${isOverdue ? 'overdue ' : ''}payment.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Project</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${projectName}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Plot Number</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${plotNumber}</td>
          </tr>
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Outstanding Balance</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #ef4444; font-weight: bold;">${formatCurrency(balance)}</td>
          </tr>
          ${dueDate ? `
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Due Date</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${dueDate}</td>
          </tr>
          ` : ''}
          ${monthlyContribution ? `
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Monthly Contribution</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatCurrency(monthlyContribution)}</td>
          </tr>
          ` : ''}
        </table>
        <p>We kindly request you to clear the outstanding balance at your earliest convenience.</p>
        <p>For any queries, please don't hesitate to contact us.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Thank you for your continued trust.<br/><br/>
          Best regards,<br/>
          <strong>Live-IN Properties</strong><br/>
          Genuine plots with ready title deeds
        </p>
      </div>
    `,
  };
}

function generateActivityAlertEmail(data: Record<string, unknown>): { subject: string; html: string } {
  const action = data.action as string;
  const userName = data.userName as string;
  const entityType = data.entityType as string;
  const details = data.details as string;
  const timestamp = data.timestamp as string;
  
  const actionLabels: Record<string, string> = {
    login: 'User Logged In',
    logout: 'User Logged Out',
    client_created: 'New Client Created',
    client_updated: 'Client Updated',
    client_deleted: 'Client Deleted',
    payment_added: 'Payment Added',
    payment_updated: 'Payment Updated',
    payment_deleted: 'Payment Deleted',
    receipt_generated: 'Receipt Generated',
    user_role_changed: 'User Role Changed',
    user_deleted: 'User Deleted',
    password_reset: 'Password Reset',
    excel_import: 'Excel Data Imported',
    database_backup: 'Database Backup Created',
  };
  
  const label = actionLabels[action] || action;
  
  return {
    subject: `🔔 System Activity: ${label}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">🔔 System Activity Alert</h2>
        <p>A new activity has been recorded in the system.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Activity</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${label}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Performed By</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${userName}</td>
          </tr>
          ${entityType ? `
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Entity Type</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${entityType}</td>
          </tr>
          ` : ''}
          ${details ? `
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Details</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${details}</td>
          </tr>
          ` : ''}
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Timestamp</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${timestamp}</td>
          </tr>
        </table>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated alert from Live-IN Properties Receipt System.
        </p>
      </div>
    `,
  };
}

function generateStaffWelcomeEmail(data: Record<string, unknown>): { subject: string; html: string } {
  const fullName = data.fullName as string;
  const email = data.email as string;
  const tempPassword = data.tempPassword as string;
  const loginUrl = data.loginUrl as string;
  
  return {
    subject: `Welcome to Live-IN Properties - Your Account Details`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">🎉 Welcome to Live-IN Properties!</h2>
        <p>Dear ${fullName},</p>
        <p>Your staff account has been created. Here are your login credentials:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
        </div>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e;">
            <strong>⚠️ Important:</strong> Please change your password immediately after your first login for security purposes.
          </p>
        </div>
        ${loginUrl ? `<p><a href="${loginUrl}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Your Account</a></p>` : ''}
        <p>If you have any questions, please contact your administrator.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Best regards,<br/>
          <strong>Live-IN Properties</strong><br/>
          Genuine plots with ready title deeds
        </p>
      </div>
    `,
  };
}

function generateUserDeletedEmail(data: Record<string, unknown>): { subject: string; html: string } {
  const deletedUserName = data.deletedUserName as string;
  const deletedUserEmail = data.deletedUserEmail as string;
  const deletedByName = data.deletedByName as string;
  const deletedAt = data.deletedAt as string;
  const isAdminNotification = data.isAdminNotification as boolean;
  
  if (isAdminNotification) {
    return {
      subject: `🔔 User Account Deleted - ${deletedUserName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">🗑️ User Account Deleted</h2>
          <p>A user account has been permanently deleted from the system.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Deleted User</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${deletedUserName}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Email</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${deletedUserEmail}</td>
            </tr>
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Deleted By</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${deletedByName}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Date & Time</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${deletedAt}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This is an automated notification from Live-IN Properties Receipt System.
          </p>
        </div>
      `,
    };
  }
  
  // Email to the deleted user
  return {
    subject: `Your Live-IN Properties Account Has Been Removed`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b7280;">Account Removal Notification</h2>
        <p>Dear ${deletedUserName},</p>
        <p>This email confirms that your account with Live-IN Properties has been removed from our system.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Account Email:</strong> ${deletedUserEmail}</p>
          <p style="margin: 5px 0;"><strong>Removal Date:</strong> ${deletedAt}</p>
        </div>
        <p>If you believe this was done in error or have any questions, please contact the system administrator.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Best regards,<br/>
          <strong>Live-IN Properties</strong><br/>
          Genuine plots with ready title deeds
        </p>
      </div>
    `,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { type, recipient, data } = await req.json() as EmailRequest;

    // Get company email for activity alerts
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("email")
      .maybeSingle();

    const companyEmail = companySettings?.email;

    let emailContent: { subject: string; html: string };
    let recipients: string[] = [];

    switch (type) {
      case 'client_update':
        emailContent = generateClientUpdateEmail(data);
        if (recipient) recipients.push(recipient);
        break;

      case 'payment_added':
        emailContent = generatePaymentAddedEmail(data);
        if (recipient) recipients.push(recipient);
        break;

      case 'payment_update':
        emailContent = generatePaymentUpdateEmail(data);
        if (recipient) recipients.push(recipient);
        break;

      case 'payment_reminder':
        emailContent = generatePaymentReminderEmail(data);
        if (recipient) recipients.push(recipient);
        break;

      case 'activity_alert':
        emailContent = generateActivityAlertEmail(data);
        if (companyEmail) recipients.push(companyEmail);
        break;

      case 'staff_welcome':
        emailContent = generateStaffWelcomeEmail(data);
        if (recipient) recipients.push(recipient);
        break;

      case 'user_deleted':
        emailContent = generateUserDeletedEmail(data);
        if (recipient) recipients.push(recipient);
        // Also send admin notification to company email
        if (data.isAdminNotification && companyEmail) {
          recipients.push(companyEmail);
        }
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    if (recipients.length === 0) {
      console.log("No recipients configured for email type:", type);
      return new Response(
        JSON.stringify({ message: "No recipients configured", skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await sendEmail(resendApiKey, recipients, emailContent.subject, emailContent.html);
    console.log(`Email sent successfully to ${recipients.join(', ')}:`, result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
