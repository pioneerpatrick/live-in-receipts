import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendNotificationEmail(
  resendApiKey: string | undefined,
  email: string,
  success: boolean,
  details: {
    filename?: string;
    recordCount?: number;
    nextBackup?: string;
    error?: string;
  }
) {
  if (!resendApiKey || !email) {
    console.log("Email notifications not configured, skipping...");
    return;
  }

  try {
    const subject = success 
      ? "✅ Database Backup Completed Successfully" 
      : "❌ Database Backup Failed";

    const html = success
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">✅ Backup Completed Successfully</h2>
          <p>Your scheduled database backup has completed successfully.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Filename</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${details.filename}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Records Backed Up</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${details.recordCount?.toLocaleString()}</td>
            </tr>
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Next Scheduled Backup</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${new Date(details.nextBackup || "").toLocaleString()}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 14px;">This is an automated message from Live-IN Properties Receipt System.</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">❌ Backup Failed</h2>
          <p>Your scheduled database backup has failed. Please check the system.</p>
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Error:</strong> ${details.error || "Unknown error"}
          </div>
          <p>Please log in to the system and check the backup settings or try a manual backup.</p>
          <p style="color: #6b7280; font-size: 14px;">This is an automated message from Live-IN Properties Receipt System.</p>
        </div>
      `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Live-IN Properties <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Resend API error: ${errorData}`);
    }

    console.log(`Notification email sent to ${email}`);
  } catch (error) {
    console.error("Failed to send notification email:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch settings including notification preferences
  const { data: settings } = await supabase
    .from("backup_settings")
    .select("*")
    .limit(1)
    .single();

  const notificationEmail = settings?.email_notifications_enabled ? settings?.notification_email : null;

  try {
    if (!settings?.auto_backup_enabled) {
      return new Response(
        JSON.stringify({ message: "Auto backup is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all data
    const tables = [
      "clients",
      "payments",
      "projects",
      "plots",
      "expenses",
      "cancelled_sales",
      "employees",
      "payroll_records",
      "employee_deductions",
      "statutory_rates",
      "company_settings",
    ];

    const backupData: Record<string, unknown[]> = {
      metadata: [{
        created_at: new Date().toISOString(),
        version: "1.0",
        type: "scheduled",
        tables,
      }],
    };

    let totalRecords = 0;

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.error(`Error fetching ${table}:`, error);
        backupData[table] = [];
      } else {
        backupData[table] = data || [];
        totalRecords += (data || []).length;
      }
    }

    // Generate filename
    const now = new Date();
    const filename = `backup-${now.toISOString().split("T")[0]}-${now.getTime()}.json`;
    const filePath = `scheduled/${filename}`;

    // Upload to storage
    const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });

    const { error: uploadError } = await supabase.storage
      .from("database-backups")
      .upload(filePath, jsonBlob, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Record in backup history
    const { error: historyError } = await supabase.from("backup_history").insert({
      filename,
      file_path: filePath,
      file_size: jsonBlob.size,
      backup_type: "scheduled",
      status: "completed",
      record_count: totalRecords,
    });

    if (historyError) {
      console.error("Failed to record backup history:", historyError);
    }

    // Update last backup time and calculate next backup
    const frequency = settings.backup_frequency || "weekly";
    const nextBackup = new Date();
    
    if (frequency === "daily") {
      nextBackup.setDate(nextBackup.getDate() + 1);
    } else if (frequency === "weekly") {
      nextBackup.setDate(nextBackup.getDate() + 7);
    } else if (frequency === "monthly") {
      nextBackup.setMonth(nextBackup.getMonth() + 1);
    }

    await supabase
      .from("backup_settings")
      .update({
        last_backup_at: now.toISOString(),
        next_backup_at: nextBackup.toISOString(),
      })
      .eq("id", settings.id);

    // Cleanup old backups based on retention
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - (settings.retention_days || 30));

    const { data: oldBackups } = await supabase
      .from("backup_history")
      .select("id, file_path")
      .lt("created_at", retentionDate.toISOString());

    if (oldBackups && oldBackups.length > 0) {
      // Delete files from storage
      const filePaths = oldBackups.map((b) => b.file_path);
      await supabase.storage.from("database-backups").remove(filePaths);

      // Delete records from history
      const ids = oldBackups.map((b) => b.id);
      await supabase.from("backup_history").delete().in("id", ids);
    }

    // Send success notification email
    if (notificationEmail) {
      await sendNotificationEmail(resendApiKey, notificationEmail, true, {
        filename,
        recordCount: totalRecords,
        nextBackup: nextBackup.toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        filename,
        recordCount: totalRecords,
        nextBackup: nextBackup.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backup error:", error);

    // Send failure notification email
    if (notificationEmail) {
      await sendNotificationEmail(resendApiKey, notificationEmail, false, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return new Response(
      JSON.stringify({ error: "Backup failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
