import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  firstName: string;
  lastName: string;
  email: string;
  inviteCode: string;
  company?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firstName, lastName, email, inviteCode, company }: InviteEmailRequest = await req.json();

    console.log(`Sending invite email to ${email} with code ${inviteCode}`);

    const inviteUrl = `https://learn.expansio.io/signup?invite=${inviteCode}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Expansio Learning <invites@learn.expansio.io>",
        to: [email],
        subject: "You're invited to Expansio Learning Platform",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #ffffff;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background: #0a1628;
              }
              a, a:link, a:visited, a:hover, a:active {
                color: #60a5fa !important;
                text-decoration: none !important;
              }
              .header {
                background: linear-gradient(135deg, #0f2847 0%, #1a3a5c 100%);
                padding: 40px 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .header img {
                max-width: 200px;
                height: auto;
                margin-bottom: 20px;
              }
              .header h1 {
                color: white;
                margin: 0;
                font-size: 28px;
              }
              .content {
                background: #1a3a5c;
                padding: 40px 30px;
                border: 1px solid #1f4466;
                border-top: none;
                color: #ffffff;
              }
              .greeting {
                font-size: 18px;
                margin-bottom: 20px;
                color: #ffffff;
              }
              .button {
                display: inline-block;
                padding: 14px 32px;
                background: #3b82f6;
                color: white !important;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
                font-size: 16px;
              }
              .button:hover {
                background: #2563eb;
              }
              .info-box {
                background: rgba(59, 130, 246, 0.1);
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
                border-left: 4px solid #3b82f6;
                color: #ffffff;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #94a3b8;
                font-size: 14px;
                border-radius: 0 0 8px 8px;
                background: #0f2847;
                border: 1px solid #1f4466;
                border-top: none;
              }
              .company-badge {
                display: inline-block;
                background: rgba(59, 130, 246, 0.2);
                color: #60a5fa;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 14px;
                margin-top: 10px;
              }
            </style>
          </head>
          <body link="#60a5fa" vlink="#60a5fa" alink="#60a5fa">
            <div class="header">
              <img src="https://learn.expansio.io/email-assets/Expansio_PNG_W_WP.png" alt="Expansio Learning" />
              <h1>Welcome to Expansio Learning</h1>
            </div>
            
            <div class="content">
              <p class="greeting">Hi ${firstName},</p>
              
              <p style="color: #ffffff;">You've been invited to access the <strong>Expansio Learning Platform</strong>!</p>
              
              ${company ? `<p class="company-badge">Organization: ${company}</p>` : ''}
              
              <p style="color: #ffffff;">Our platform provides comprehensive courses and sales training resources to help you excel in your career.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" class="button">Create My Account →</a>
              </div>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>⏰ Important:</strong> This invite expires in 30 days.</p>
              </div>
              
              <p style="font-size: 14px; color: #ffffff !important; margin-top: 30px;">
                <span style="color: #ffffff !important;">Or copy and paste this link into your browser:</span><br>
                <a href="${inviteUrl}" style="color: #60a5fa !important; word-break: break-all; text-decoration: none !important;">${inviteUrl}</a>
              </p>
            </div>
            
            <div class="footer">
              <p>If you have any questions, feel free to reach out to us.</p>
              <p style="margin-top: 15px;">
                <strong>The Expansio Team</strong>
              </p>
            </div>
          </body>
        </html>
      `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(error)}`);
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
