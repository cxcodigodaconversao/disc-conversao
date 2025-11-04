import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
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

    // Generate assessment link
    const assessmentLink = `${req.headers.get("origin")}/assessment/${assessmentId}`;

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
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e0e0e0;
                border-top: none;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 8px;
                margin: 20px 0;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">DISC da Conversão</h1>
            </div>
            <div class="content">
              <h2>Olá ${candidateName || candidateEmail}!</h2>
              <p>Você foi convidado(a) a participar do assessment DISC para a campanha: <strong>${campaignName}</strong></p>
              
              <p>O Assessment DISC é uma ferramenta poderosa que identifica características comportamentais através de 4 perfis principais:</p>
              <ul>
                <li><strong>D</strong> - Dominância</li>
                <li><strong>I</strong> - Influência</li>
                <li><strong>S</strong> - Estabilidade</li>
                <li><strong>C</strong> - Conformidade</li>
              </ul>
              
              <p>O processo é dividido em 3 etapas simples e levará aproximadamente 15-20 minutos.</p>
              
              <div style="text-align: center;">
                <a href="${assessmentLink}" class="button">Iniciar Assessment</a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Ou copie e cole este link no seu navegador:<br>
                <a href="${assessmentLink}">${assessmentLink}</a>
              </p>
              
              <p>Se você tiver alguma dúvida, não hesite em entrar em contato conosco.</p>
              
              <p>Atenciosamente,<br><strong>Equipe DISC da Conversão</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 DISC da Conversão. Todos os direitos reservados.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update assessment status
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
