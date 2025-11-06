import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessment_id } = await req.json();

    if (!assessment_id) {
      throw new Error('assessment_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Regenerating PDF for assessment:', assessment_id);

    // 1. Get current result to find old PDF path
    const { data: result, error: resultError } = await supabase
      .from('results')
      .select('report_url')
      .eq('assessment_id', assessment_id)
      .single();

    if (resultError) {
      console.error('Error fetching result:', resultError);
      throw resultError;
    }

    // 2. Delete old PDF from storage if exists
    if (result?.report_url) {
      const urlParts = result.report_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `reports/${fileName}`;

      console.log('Deleting old PDF:', filePath);

      const { error: deleteError } = await supabase.storage
        .from('assessment-reports')
        .remove([filePath]);

      if (deleteError) {
        console.error('Error deleting old PDF:', deleteError);
        // Continue even if deletion fails
      }
    }

    // 3. Clear report_url from database
    const { error: updateError } = await supabase
      .from('results')
      .update({ report_url: null })
      .eq('assessment_id', assessment_id);

    if (updateError) {
      console.error('Error clearing report_url:', updateError);
      throw updateError;
    }

    // 4. Generate new PDF
    console.log('Generating new PDF...');
    const { data: pdfData, error: pdfError } = await supabase.functions.invoke(
      'generate-pdf-report',
      { body: { assessment_id } }
    );

    if (pdfError) {
      console.error('Error generating new PDF:', pdfError);
      throw pdfError;
    }

    console.log('PDF regenerated successfully:', pdfData.pdf_url);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdf_url: pdfData.pdf_url,
        message: 'PDF regenerado com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in regenerate-pdf:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
