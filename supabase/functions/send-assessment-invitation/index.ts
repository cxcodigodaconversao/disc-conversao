import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Generate assessment link using environment variable
    const appUrl = Deno.env.get("APP_URL") || Deno.env.get("VITE_SUPABASE_URL") || "https://wqygamcvraihqsslowhs.supabase.co";
    const assessmentLink = `${appUrl}/assessment/${assessmentId}`;
    
    console.log("Assessment link generated:", assessmentLink);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "DISC da Conversão <onboarding@resend.dev>",
      to: [candidateEmail],
      subject: `Convite: Assessment DISC - ${campaignName}`,
      html: `
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
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Check if email was actually sent (no error from Resend)
    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw new Error(`Falha ao enviar email: ${emailResponse.error.message}`);
    }

    // Only update assessment status if email was sent successfully
    if (emailResponse.data) {
      const { error: updateError } = await supabaseClient
        .from("assessments")
        .update({
          status: "sent",
          invitation_sent_at: new Date().toISOString(),
        })
        .eq("id", assessmentId);

      if (updateError) {
        console.error("Error updating assessment:", updateError);
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
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
