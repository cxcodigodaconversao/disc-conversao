import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  assessmentId: string;
  candidateEmail: string;
  candidateName?: string;
  campaignName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { assessmentId, candidateEmail, candidateName, campaignName }: InvitationRequest = await req.json();

    console.log("Sending invitation to:", candidateEmail, "for assessment:", assessmentId);

    // Get current assessment to increment send_attempts
    const { data: currentAssessment } = await supabaseClient
      .from("assessments")
      .select("send_attempts")
      .eq("id", assessmentId)
      .single();

    const currentAttempts = currentAssessment?.send_attempts || 0;

    // Generate assessment link using APP_URL environment variable
    const appUrl = Deno.env.get("APP_URL") || "https://disc-conversao.netlify.app";
    const assessmentLink = `${appUrl}/assessment/${assessmentId}`;
    
    console.log("Assessment link generated:", assessmentLink);
    console.log("Current send attempts:", currentAttempts);

    // Get Gmail credentials from environment
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Gmail credentials not configured");
    }

    // Prepare email content
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #f5f5f5;">
    <tr>
      <td style="background: #667eea; color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">DISC da Conversão</h1>
      </td>
    </tr>
    <tr>
      <td style="background: #ffffff; padding: 30px;">
        <h2 style="color: #333; margin-top: 0;">Olá ${candidateName || ""}!</h2>
        <p style="margin: 16px 0;">Você foi convidado(a) a participar do Assessment DISC para a campanha: <strong>${campaignName}</strong></p>
        <p style="margin: 16px 0;">O processo leva aproximadamente 15-20 minutos.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${assessmentLink}" style="display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Iniciar Avaliação</a>
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0; font-size: 12px; color: #666;">
          Ou copie este link: <a href="${assessmentLink}" style="color: #667eea; word-break: break-all;">${assessmentLink}</a>
        </p>
        <p style="margin: 16px 0;">Atenciosamente,<br><strong>Equipe DISC da Conversão</strong></p>
      </td>
    </tr>
    <tr>
      <td style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">© 2025 DISC da Conversão. Todos os direitos reservados.</p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email via Gmail SMTP using native fetch
    const emailPayload = {
      personalizations: [
        {
          to: [{ email: candidateEmail }],
          subject: `Convite: Assessment DISC - ${campaignName}`,
        },
      ],
      from: { email: gmailUser, name: "DISC da Conversão" },
      content: [
        {
          type: "text/html",
          value: emailHtml,
        },
      ],
    };

    // Create base64 encoded credentials for SMTP AUTH
    const authString = btoa(`${gmailUser}:${gmailAppPassword}`);

    // Use Gmail SMTP via API-like approach (nodemailer not available in Deno easily)
    // Instead, we'll use a direct SMTP connection simulation via Gmail API
    // For simplicity with Gmail, we'll use their SMTP relay via a workaround
    
    // Actually, let's use a proper approach: Gmail SMTP via raw socket is complex in Deno
    // Better solution: Use Gmail API or a simple HTTP-based email service
    // Since we have credentials, let's use a direct SMTP client library
    
    // Import a Deno-compatible SMTP client
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailAppPassword,
        },
      },
    });

    try {
      await client.send({
        from: `DISC da Conversão <${gmailUser}>`,
        to: candidateEmail,
        subject: `Convite: Assessment DISC - ${campaignName}`,
        html: emailHtml,
      });

      console.log("Email sent successfully via Gmail SMTP");

      // Update assessment status to sent
      const { error: updateError } = await supabaseClient
        .from("assessments")
        .update({
          status: "sent",
          invitation_sent_at: new Date().toISOString(),
          send_attempts: currentAttempts + 1,
          last_error_message: null,
        })
        .eq("id", assessmentId);

      if (updateError) {
        console.error("Error updating assessment:", updateError);
        throw updateError;
      }

      await client.close();

      return new Response(
        JSON.stringify({ success: true, message: "Email sent successfully" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (emailError: any) {
      console.error("Gmail SMTP error:", emailError);
      
      await client.close();

      // Update assessment with error details
      await supabaseClient
        .from("assessments")
        .update({
          status: "failed",
          last_error_message: emailError.message || "Failed to send email",
          send_attempts: currentAttempts + 1,
        })
        .eq("id", assessmentId);

      throw new Error(`Falha ao enviar email: ${emailError.message}`);
    }
  } catch (error: any) {
    console.error("Error in send-assessment-invitation function:", error);
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
