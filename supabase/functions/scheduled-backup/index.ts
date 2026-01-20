import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if auto backup is enabled
    const { data: settings } = await supabase
      .from("backup_settings")
      .select("*")
      .limit(1)
      .single();

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
    return new Response(
      JSON.stringify({ error: "Backup failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
