import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { assessment_id } = await req.json();
    
    console.log('Generating PDF report for assessment:', assessment_id);

    // Fetch assessment and results
    const { data: assessment, error: assessmentError } = await supabaseClient
      .from('assessments')
      .select('*, results(*)')
      .eq('id', assessment_id)
      .single();

    if (assessmentError) throw assessmentError;
    if (!assessment || !assessment.results || assessment.results.length === 0) {
      throw new Error('Assessment or results not found');
    }

    const result = assessment.results[0];

    // Generate PDF URL placeholder
    // For now, we'll return a message indicating PDF generation is in progress
    // In production, this would integrate with a PDF generation service
    const pdfUrl = `https://placeholder-pdf-url.com/report-${assessment_id}.pdf`;

    // Update result with PDF URL
    const { error: updateError } = await supabaseClient
      .from('results')
      .update({ report_url: pdfUrl })
      .eq('id', result.id);

    if (updateError) throw updateError;

    console.log('PDF report generated successfully');

    return new Response(
      JSON.stringify({ success: true, pdf_url: pdfUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});