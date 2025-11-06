import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsPDF } from "npm:jspdf@2.5.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessment_id } = await req.json();
    console.log('Generating PDF report for assessment:', assessment_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch assessment data
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select(`*, campaigns (name, description)`)
      .eq('id', assessment_id)
      .single();

    if (assessmentError) throw assessmentError;

    // Fetch result data
    const { data: result, error: resultError } = await supabase
      .from('results')
      .select('*')
      .eq('assessment_id', assessment_id)
      .single();

    if (resultError) throw resultError;

    console.log('Generating chart images...');
    
    // Generate chart images
    const chartImages: Record<string, string> = {};
    
    try {
      const discData = {
        natural: [
          { factor: 'D', value: result.natural_d },
          { factor: 'I', value: result.natural_i },
          { factor: 'S', value: result.natural_s },
          { factor: 'C', value: result.natural_c }
        ],
        adapted: [
          { factor: 'D', value: result.adapted_d },
          { factor: 'I', value: result.adapted_i },
          { factor: 'S', value: result.adapted_s },
          { factor: 'C', value: result.adapted_c }
        ]
      };

      const { data: discChart } = await supabase.functions.invoke('generate-chart-image', {
        body: { chartType: 'disc-bars', data: discData, title: 'Perfil DISC' }
      });
      if (discChart?.imageUrl) chartImages.disc = discChart.imageUrl;
    } catch (e) {
      console.error('Error generating DISC chart:', e);
    }

    try {
      if (result.values_scores) {
        const { data: valuesChart } = await supabase.functions.invoke('generate-chart-image', {
          body: { chartType: 'values-radar', data: result.values_scores, title: 'Valores Motivacionais' }
        });
        if (valuesChart?.imageUrl) chartImages.values = valuesChart.imageUrl;
      }
    } catch (e) {
      console.error('Error generating values chart:', e);
    }

    try {
      if (result.leadership_style) {
        const { data: leadershipChart } = await supabase.functions.invoke('generate-chart-image', {
          body: { chartType: 'leadership-pie', data: result.leadership_style, title: 'Estilo de Liderança' }
        });
        if (leadershipChart?.imageUrl) chartImages.leadership = leadershipChart.imageUrl;
      }
    } catch (e) {
      console.error('Error generating leadership chart:', e);
    }

    try {
      if (result.competencies) {
        const { data: competenciesChart } = await supabase.functions.invoke('generate-chart-image', {
          body: { chartType: 'competencies-bars', data: result.competencies, title: 'Mapa de Competências' }
        });
        if (competenciesChart?.imageUrl) chartImages.competencies = competenciesChart.imageUrl;
      }
    } catch (e) {
      console.error('Error generating competencies chart:', e);
    }

    console.log('Chart images generated successfully');

    // Generate PDF document
    const pdfBytes = await generatePDFDocument(assessment, result, chartImages);
    
    console.log('PDF generated, size:', pdfBytes.byteLength, 'bytes');

    // Upload to Supabase Storage
    const fileName = `reports/${assessment_id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('assessment-reports')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assessment-reports')
      .getPublicUrl(fileName);

    // Update result with PDF URL
    const { error: updateError } = await supabase
      .from('results')
      .update({ report_url: publicUrl })
      .eq('assessment_id', assessment_id);

    if (updateError) throw updateError;

    console.log('PDF report generated successfully:', publicUrl);

    return new Response(
      JSON.stringify({ success: true, url: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generatePDFDocument(assessment: any, result: any, chartImages: Record<string, string>): Promise<Uint8Array> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageHeight = 297, pageWidth = 210, margin = 20, contentWidth = pageWidth - (2 * margin);
  let yPos = margin, currentPage = 1;

  const addPage = () => { doc.addPage(); currentPage++; yPos = margin + 10; };
  
  // CAPA
  doc.setFont('helvetica', 'bold').setFontSize(28).setTextColor(30, 64, 175);
  doc.text('MAPEAMENTO DE PERFIL COMPORTAMENTAL', pageWidth / 2, 80, { align: 'center' });
  doc.setFont('helvetica', 'normal').setFontSize(18).setTextColor(0, 0, 0);
  doc.text(assessment.candidate_name || 'N/A', pageWidth / 2, 120, { align: 'center' });
  doc.setFontSize(12).setTextColor(100, 100, 100);
  doc.text(`Campanha: ${assessment.campaigns?.name || 'N/A'}`, pageWidth / 2, 140, { align: 'center' });
  doc.text(`Data: ${new Date(assessment.created_at).toLocaleDateString('pt-BR')}`, pageWidth / 2, 150, { align: 'center' });

  // CONTEÚDO
  addPage();
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(30, 64, 175);
  doc.text('Conteúdo', margin, yPos); yPos += 15;
  const sections = ['1. RELATÓRIO COMPORTAMENTAL', '2. METODOLOGIA DISC', '3. INTENSIDADE DO PERFIL NATURAL', '4. INTENSIDADE DO PERFIL ADAPTADO', '5. COMO LIDA COM PROBLEMAS', '6. PONTOS A DESENVOLVER', '7. TIPOS PSICOLÓGICOS', '8. TEORIA DE VALORES', '9. ESTILO DE LIDERANÇA', '10. MAPA DE COMPETÊNCIAS', '11. SUGESTÕES DE COMUNICAÇÃO'];
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(0, 0, 0);
  sections.forEach(s => { doc.text(s, margin + 5, yPos); yPos += 8; });

  // Perfil Natural
  addPage();
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(30, 64, 175);
  doc.text('PERFIL NATURAL', margin, yPos); yPos += 10;
  doc.setFont('helvetica', 'normal').setFontSize(11);
  doc.text(`D: ${result.natural_d} | I: ${result.natural_i} | S: ${result.natural_s} | C: ${result.natural_c}`, margin, yPos); yPos += 10;
  doc.text(`Perfil: ${result.primary_profile || 'N/A'}`, margin, yPos); yPos += 15;
  
  if (chartImages.disc) {
    try {
      const res = await fetch(chartImages.disc);
      const ab = await res.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
      doc.addImage(`data:image/png;base64,${b64}`, 'PNG', margin, yPos, contentWidth, 60);
      yPos += 65;
    } catch (e) { console.error('Chart error:', e); }
  }

  // Finalizar
  const pdfArrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(pdfArrayBuffer);
}
