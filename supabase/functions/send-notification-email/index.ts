import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "new_message" | "connection_request" | "connection_accepted";
  recipientUserId: string;
  senderName: string;
  senderAgencyName?: string;
  messagePreview?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipientUserId, senderName, senderAgencyName, messagePreview }: NotificationRequest = await req.json();

    console.log(`Processing ${type} notification for user ${recipientUserId}`);

    // Get recipient's email from profiles
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", recipientUserId)
      .single();

    if (profileError || !profile) {
      console.error("Failed to fetch recipient profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Recipient not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientEmail = profile.email;
    const recipientName = profile.full_name || "there";

    let subject: string;
    let htmlContent: string;

    const baseUrl = "https://teelukblrpynzcdabtuu.lovableproject.com";

    switch (type) {
      case "new_message":
        subject = `New message from ${senderName}`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a2942; margin-bottom: 20px;">New Message</h2>
            <p style="color: #333; font-size: 16px;">Hi ${recipientName},</p>
            <p style="color: #333; font-size: 16px;">You have a new message from <strong>${senderName}</strong>${senderAgencyName ? ` (${senderAgencyName})` : ""}:</p>
            ${messagePreview ? `<div style="background: #f5f5f5; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;"><p style="color: #555; margin: 0; font-style: italic;">"${messagePreview.substring(0, 150)}${messagePreview.length > 150 ? '...' : ''}"</p></div>` : ""}
            <a href="${baseUrl}/network?tab=messages" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">View Message</a>
            <p style="color: #888; font-size: 14px; margin-top: 30px;">Best regards,<br>The Expansio Team</p>
          </div>
        `;
        break;

      case "connection_request":
        subject = `${senderName} wants to connect with you`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a2942; margin-bottom: 20px;">New Connection Request</h2>
            <p style="color: #333; font-size: 16px;">Hi ${recipientName},</p>
            <p style="color: #333; font-size: 16px;"><strong>${senderName}</strong>${senderAgencyName ? ` from <strong>${senderAgencyName}</strong>` : ""} would like to connect with you on the Affiliate Network.</p>
            ${messagePreview ? `<div style="background: #f5f5f5; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;"><p style="color: #555; margin: 0;"><strong>Their message:</strong></p><p style="color: #555; margin: 10px 0 0 0; font-style: italic;">"${messagePreview.substring(0, 200)}${messagePreview.length > 200 ? '...' : ''}"</p></div>` : ""}
            <a href="${baseUrl}/network?tab=connections" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">View Request</a>
            <p style="color: #888; font-size: 14px; margin-top: 30px;">Best regards,<br>The Expansio Team</p>
          </div>
        `;
        break;

      case "connection_accepted":
        subject = `${senderName} accepted your connection request`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a2942; margin-bottom: 20px;">Connection Accepted! 🎉</h2>
            <p style="color: #333; font-size: 16px;">Hi ${recipientName},</p>
            <p style="color: #333; font-size: 16px;">Great news! <strong>${senderName}</strong>${senderAgencyName ? ` from <strong>${senderAgencyName}</strong>` : ""} has accepted your connection request.</p>
            <p style="color: #333; font-size: 16px;">You can now start collaborating and messaging each other directly.</p>
            <a href="${baseUrl}/network?tab=connections" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">View Connection</a>
            <p style="color: #888; font-size: 14px; margin-top: 30px;">Best regards,<br>The Expansio Team</p>
          </div>
        `;
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid notification type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const emailResponse = await resend.emails.send({
      from: "Expansio <onboarding@resend.dev>",
      to: [recipientEmail],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
