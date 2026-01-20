import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OverdueClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  project_name: string;
  plot_number: string;
  balance: number;
  next_payment_date: string | null;
  installment_months: number | null;
  total_price: number;
  discount: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email notifications");
      return new Response(
        JSON.stringify({ success: true, message: "Email service not configured", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch company settings
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("company_name, email")
      .single();

    const companyName = companySettings?.company_name || "Live-IN Properties";
    const fromEmail = "onboarding@resend.dev"; // Use Resend's default sender for testing

    // Fetch overdue clients with email addresses
    const { data: overdueClients, error: fetchError } = await supabase
      .from("clients")
      .select("id, name, email, phone, project_name, plot_number, balance, next_payment_date, installment_months, total_price, discount")
      .eq("status", "overdue")
      .gt("balance", 0)
      .not("email", "is", null)
      .neq("email", "");

    if (fetchError) {
      console.error("Error fetching overdue clients:", fetchError);
      throw fetchError;
    }

    if (!overdueClients || overdueClients.length === 0) {
      console.log("No overdue clients with email addresses found");
      return new Response(
        JSON.stringify({ success: true, message: "No overdue clients to notify", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${overdueClients.length} overdue clients with emails`);

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const client of overdueClients as OverdueClient[]) {
      try {
        // Calculate monthly contribution if applicable
        const effectivePrice = client.total_price - (client.discount || 0);
        const monthlyContribution = client.installment_months 
          ? Math.ceil(effectivePrice / client.installment_months) 
          : null;

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0d4f4f 0%, #1a6b6b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${companyName}</h1>
              <p style="color: #e0e0e0; margin: 10px 0 0 0;">Payment Reminder</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Dear <strong>${client.name}</strong>,</p>
              
              <p>This is a friendly reminder that your payment for the following property is <span style="color: #dc2626; font-weight: bold;">overdue</span>:</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Project:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${client.project_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Plot Number:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${client.plot_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Outstanding Balance:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">KES ${client.balance.toLocaleString()}</td>
                  </tr>
                  ${monthlyContribution ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Monthly Contribution:</td>
                    <td style="padding: 8px 0; font-weight: bold;">KES ${monthlyContribution.toLocaleString()}</td>
                  </tr>
                  ` : ''}
                  ${client.next_payment_date ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Due Date:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${new Date(client.next_payment_date).toLocaleDateString()}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <p>Please make your payment as soon as possible to avoid any further delays in your property acquisition.</p>
              
              <p style="margin-top: 20px;">For any questions or to arrange payment, please contact us:</p>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 5px 0;">📧 Email: liveinproperties2021@gmail.com</li>
                <li style="padding: 5px 0;">📞 Phone: 0746499499</li>
              </ul>
              
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
                Thank you for choosing ${companyName}.<br>
                <em>We Secure Your Future</em>
              </p>
            </div>
          </body>
          </html>
        `;

        // Send email using Resend API directly
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `${companyName} <${fromEmail}>`,
            to: [client.email],
            subject: `Payment Reminder - ${client.project_name} Plot ${client.plot_number}`,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Resend API error: ${errorData}`);
        }

        console.log(`Reminder sent to ${client.name} (${client.email})`);
        sentCount++;
      } catch (emailError: unknown) {
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        console.error(`Failed to send reminder to ${client.name}:`, emailError);
        errors.push(`${client.name}: ${errorMessage}`);
        failedCount++;
      }
    }

    const result = {
      success: true,
      message: `Payment reminders sent: ${sentCount} successful, ${failedCount} failed`,
      sent: sentCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    console.log("Daily payment reminders completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in daily-payment-reminders:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
