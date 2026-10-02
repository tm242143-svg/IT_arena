
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Verify the webhook's shared secret.
    const expectedSecret = Deno.env.get("WEBHOOK_SECRET");
    const receivedSecret = req.headers.get("x-webhook-secret");

    if (!expectedSecret || receivedSecret !== expectedSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const payload = await req.json();

    // Accept only INSERT events from the email-only block event table.
    if (
      payload.type !== "INSERT" ||
      payload.table !== "block_email_events" ||
      payload.schema !== "public"
    ) {
      return jsonResponse({
        success: true,
        ignored: true,
        reason: "Not a block email event",
      });
    }

    const record = payload.record;

    if (!record || !record.id) {
      return jsonResponse({ error: "Missing event record or ID" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appsScriptUrl = Deno.env.get("APPS_SCRIPT_URL");

    if (!supabaseUrl || !serviceRoleKey || !appsScriptUrl) {
      throw new Error("Missing Edge Function environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Get every admin email from the profiles table.
    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "admin");

    if (adminError) {
      throw new Error(`Could not fetch admins: ${adminError.message}`);
    }

    const recipients = [
      ...new Set(
        (admins ?? [])
          .map((admin) => String(admin.email ?? "").trim())
          .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
      ),
    ];

    if (recipients.length === 0) {
      throw new Error("No valid admin email addresses found");
    }

    // Forward the event to Google Apps Script.
    const emailPayload = {
      secret: expectedSecret,
      event_id: String(record.id),
      recipients,
      student_name: record.student_name || "N/A",
      student_email: record.student_email || "N/A",
      student_department: record.student_department || "N/A",
      message: record.message || "A student has been blocked in MZ Arena.",
    };

    const emailResponse = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
      redirect: "follow",
    });

    const responseText = await emailResponse.text();

    if (!emailResponse.ok) {
      throw new Error(
        `Apps Script request failed: HTTP ${emailResponse.status}`,
      );
    }

    let emailResult: { success?: boolean; error?: string };

    try {
      emailResult = JSON.parse(responseText);
    } catch {
      throw new Error(
        "Apps Script did not return JSON. Check the web app deployment and URL.",
      );
    }

    if (!emailResult.success) {
      throw new Error(
        emailResult.error || "Apps Script reported an email failure",
      );
    }

    return jsonResponse({
      success: true,
      recipientCount: recipients.length,
      duplicate: Boolean((emailResult as { duplicate?: boolean }).duplicate),
    });
  } catch (error) {
    console.error("send-admin-push error:", error);

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});