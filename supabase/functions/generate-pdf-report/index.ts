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

    // Fetch assessment and results with all related data
    const { data: assessment, error: assessmentError } = await supabaseClient
      .from('assessments')
      .select('*, results(*), campaigns(name)')
      .eq('id', assessment_id)
      .single();

    if (assessmentError) throw assessmentError;
    if (!assessment || !assessment.results || assessment.results.length === 0) {
      throw new Error('Assessment or results not found');
    }

    const result = assessment.results[0];

    // Generate comprehensive HTML report
    const htmlContent = generateHTMLReport(assessment, result);

    // Convert HTML to PDF using Puppeteer/Chrome
    const pdfResponse = await fetch('https://api.html2pdf.app/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: htmlContent,
        options: {
          format: 'A4',
          printBackground: true,
          margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
        }
      })
    });

    if (!pdfResponse.ok) {
      // Fallback: Generate simple text-based report
      const textReport = generateTextReport(assessment, result);
      const encoder = new TextEncoder();
      const pdfBytes = encoder.encode(textReport);

      const fileName = `reports/${assessment_id}.txt`;
      const { error: uploadError } = await supabaseClient.storage
        .from('assessment-reports')
        .upload(fileName, pdfBytes, {
          contentType: 'text/plain',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabaseClient.storage
        .from('assessment-reports')
        .getPublicUrl(fileName);

      const reportUrl = urlData.publicUrl;

      await supabaseClient
        .from('results')
        .update({ report_url: reportUrl })
        .eq('id', result.id);

      return new Response(
        JSON.stringify({ success: true, pdf_url: reportUrl, format: 'text' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBytes = await pdfResponse.arrayBuffer();
    const fileName = `reports/${assessment_id}.pdf`;

    // Upload PDF to Supabase Storage
    const { error: uploadError } = await supabaseClient.storage
      .from('assessment-reports')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('assessment-reports')
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Update result with PDF URL
    const { error: updateError } = await supabaseClient
      .from('results')
      .update({ report_url: pdfUrl })
      .eq('id', result.id);

    if (updateError) throw updateError;

    console.log('PDF report generated successfully:', pdfUrl);

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

function generateTextReport(assessment: any, result: any): string {
  return `
MAPEAMENTO DE PERFIL COMPORTAMENTAL
====================================

Candidato: ${assessment.candidate_name || 'N/A'}
Campanha: ${assessment.campaigns?.name || 'N/A'}
Data: ${new Date(assessment.completed_at).toLocaleDateString('pt-BR')}

PERFIL DISC
-----------
Perfil Natural (como você realmente é):
  D (Dominância): ${result.natural_d}
  I (Influência): ${result.natural_i}
  S (Estabilidade): ${result.natural_s}
  C (Conformidade): ${result.natural_c}

Perfil Adaptado (como você se comporta no trabalho):
  D (Dominância): ${result.adapted_d}
  I (Influência): ${result.adapted_i}
  S (Estabilidade): ${result.adapted_s}
  C (Conformidade): ${result.adapted_c}

Perfil Primário: ${result.primary_profile || 'N/A'}
Perfil Secundário: ${result.secondary_profile || 'N/A'}
Nível de Tensão: ${result.tension_level || 'Baixo'}

TIPO JUNGIANO
-------------
${result.jung_type ? `Tipo: ${result.jung_type.type || 'N/A'}
Extroversão: ${result.jung_type.extroversion || 0}
Introversão: ${result.jung_type.introversion || 0}
Intuição: ${result.jung_type.intuition || 0}
Sensação: ${result.jung_type.sensing || 0}
Pensamento: ${result.jung_type.thinking || 0}
Sentimento: ${result.jung_type.feeling || 0}` : 'N/A'}

VALORES
-------
${result.values_scores ? Object.entries(result.values_scores)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n') : 'N/A'}

ESTILO DE LIDERANÇA
-------------------
${result.leadership_style ? Object.entries(result.leadership_style)
  .map(([key, value]) => `${key}: ${value}%`)
  .join('\n') : 'N/A'}

COMPETÊNCIAS
------------
${result.competencies ? Object.entries(result.competencies)
  .map(([key, value]: [string, any]) => {
    const level = value > 30 ? 'Alto' : value > 15 ? 'Médio' : 'Baixo';
    return `${key}: ${level} (${value})`;
  })
  .join('\n') : 'N/A'}

INSIGHTS PARA VENDAS
--------------------
${result.sales_insights ? `
Pontos Fortes:
${result.sales_insights.strengths?.map((s: string) => `• ${s}`).join('\n') || 'N/A'}

Abordagem:
${result.sales_insights.approach || 'N/A'}
` : 'N/A'}

====================================
Relatório gerado pelo CIS Assessment
`;
}

function generateHTMLReport(assessment: any, result: any): string {
  const discColors: Record<string, string> = {
    D: '#EF4444',
    I: '#F59E0B',
    S: '#10B981',
    C: '#3B82F6'
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Perfil Comportamental</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; color: #1e293b; line-height: 1.6; }
    .page { width: 210mm; min-height: 297mm; padding: 20mm; page-break-after: always; }
    .cover { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
    .cover h1 { font-size: 48px; color: #1e293b; margin-bottom: 20px; }
    .cover h2 { font-size: 32px; color: #64748b; margin: 20px 0; }
    .cover p { font-size: 16px; color: #94a3b8; margin: 10px 0; }
    h1 { font-size: 32px; color: #1e293b; margin-bottom: 20px; border-bottom: 3px solid #3B82F6; padding-bottom: 10px; }
    h2 { font-size: 24px; color: #1e293b; margin: 20px 0 10px; }
    h3 { font-size: 18px; color: #475569; margin: 15px 0 8px; }
    p, li { font-size: 12px; color: #475569; margin: 8px 0; }
    .disc-bar { display: flex; gap: 10px; margin: 20px 0; }
    .bar { flex: 1; text-align: center; }
    .bar-fill { height: 200px; background: #e2e8f0; position: relative; display: flex; flex-direction: column-reverse; border-radius: 5px; }
    .bar-fill span { display: block; border-radius: 5px 5px 0 0; color: white; font-weight: bold; padding: 10px 0; }
    .bar-label { margin-top: 10px; font-weight: bold; }
    .values-list { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .value-item { padding: 10px; background: #f1f5f9; border-radius: 5px; }
    .competency-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .competency { padding: 10px; border-radius: 5px; text-align: center; font-size: 11px; }
    .high { background: #dcfce7; color: #166534; }
    .medium { background: #fef3c7; color: #854d0e; }
    .low { background: #fee2e2; color: #991b1b; }
    .tips { background: #f8fafc; padding: 15px; border-left: 4px solid #3B82F6; margin: 15px 0; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <!-- PÁGINA 1: CAPA -->
  <div class="page cover">
    <h1>Mapeamento de Perfil<br/>Comportamental</h1>
    <h2>${assessment.candidate_name || 'Candidato'}</h2>
    <p>Solicitado por: ${assessment.campaigns?.name || 'Cliente'}</p>
    <p>Data: ${new Date(assessment.completed_at).toLocaleDateString('pt-BR')}</p>
  </div>

  <!-- PÁGINA 2: METODOLOGIA DISC -->
  <div class="page">
    <h1>Metodologia DISC</h1>
    <p>Criada por William Marston em 1928, a metodologia DISC identifica 4 fatores comportamentais principais que determinam como as pessoas agem, reagem e interagem em diferentes situações.</p>
    
    <h3 style="color: ${discColors['D']}">D - Dominância</h3>
    <p>Focado em resultados, direto e orientado para ação. Valoriza eficiência e autonomia. Pessoas com D alto são decididas, competitivas e gostam de desafios.</p>
    
    <h3 style="color: ${discColors['I']}">I - Influência</h3>
    <p>Comunicativo, entusiasta e persuasivo. Valoriza relacionamentos e reconhecimento. Pessoas com I alto são sociáveis, otimistas e gostam de trabalhar em equipe.</p>
    
    <h3 style="color: ${discColors['S']}">S - Estabilidade</h3>
    <p>Paciente, confiável e leal. Valoriza harmonia e processos consistentes. Pessoas com S alto são calmas, colaborativas e preferem ambientes previsíveis.</p>
    
    <h3 style="color: ${discColors['C']}">C - Conformidade</h3>
    <p>Analítico, preciso e orientado para qualidade. Valoriza dados e padrões. Pessoas com C alto são detalhistas, sistemáticas e focadas em qualidade.</p>
  </div>

  <!-- PÁGINA 3: INTENSIDADE DO PERFIL -->
  <div class="page">
    <h1>Intensidade do Perfil DISC</h1>
    
    <h2>Perfil Natural (como você realmente é)</h2>
    <div class="disc-bar">
      ${['D', 'I', 'S', 'C'].map(factor => {
        const key = `natural_${factor.toLowerCase()}`;
        const value = result[key] || 0;
        return `
        <div class="bar">
          <div class="bar-fill">
            <span style="height: ${(value / 40) * 100}%; background: ${discColors[factor]}">
              ${value}
            </span>
          </div>
          <div class="bar-label" style="color: ${discColors[factor]}">${factor}</div>
        </div>
      `;
      }).join('')}
    </div>

    <h2>Perfil Adaptado (como você se comporta no trabalho)</h2>
    <div class="disc-bar">
      ${['D', 'I', 'S', 'C'].map(factor => {
        const key = `adapted_${factor.toLowerCase()}`;
        const value = result[key] || 0;
        return `
        <div class="bar">
          <div class="bar-fill">
            <span style="height: ${(value / 40) * 100}%; background: ${discColors[factor]}">
              ${value}
            </span>
          </div>
          <div class="bar-label" style="color: ${discColors[factor]}">${factor}</div>
        </div>
      `;
      }).join('')}
    </div>

    <div class="tips">
      <h3>Resumo do Perfil</h3>
      <p><strong>Perfil Primário:</strong> ${result.primary_profile || 'N/A'}</p>
      <p><strong>Perfil Secundário:</strong> ${result.secondary_profile || 'N/A'}</p>
      <p><strong>Nível de Tensão:</strong> ${result.tension_level || 'Baixo'}</p>
    </div>
  </div>

  <!-- PÁGINA 4: TIPO JUNGIANO -->
  <div class="page">
    <h1>Tipos Psicológicos (Jung)</h1>
    ${result.jung_type ? `
      <h2>Tipo: ${result.jung_type.type || 'N/A'}</h2>
      <div class="values-list">
        <div class="value-item">
          <strong>Extroversão:</strong> ${result.jung_type.extroversion || 0}
        </div>
        <div class="value-item">
          <strong>Introversão:</strong> ${result.jung_type.introversion || 0}
        </div>
        <div class="value-item">
          <strong>Intuição:</strong> ${result.jung_type.intuition || 0}
        </div>
        <div class="value-item">
          <strong>Sensação:</strong> ${result.jung_type.sensing || 0}
        </div>
        <div class="value-item">
          <strong>Pensamento:</strong> ${result.jung_type.thinking || 0}
        </div>
        <div class="value-item">
          <strong>Sentimento:</strong> ${result.jung_type.feeling || 0}
        </div>
      </div>
    ` : '<p>Dados não disponíveis</p>'}
  </div>

  <!-- PÁGINA 5: VALORES -->
  <div class="page">
    <h1>Teoria de Valores</h1>
    ${result.values_scores ? `
      <div class="values-list">
        ${Object.entries(result.values_scores).map(([key, value]) => `
          <div class="value-item">
            <strong>${key}:</strong> ${value}
          </div>
        `).join('')}
      </div>
    ` : '<p>Dados não disponíveis</p>'}
  </div>

  <!-- PÁGINA 6: LIDERANÇA -->
  <div class="page">
    <h1>Estilo de Liderança</h1>
    ${result.leadership_style ? `
      <div class="values-list">
        ${Object.entries(result.leadership_style).map(([key, value]) => `
          <div class="value-item">
            <strong>${key}:</strong> ${value}%
          </div>
        `).join('')}
      </div>
    ` : '<p>Dados não disponíveis</p>'}
  </div>

  <!-- PÁGINA 7: COMPETÊNCIAS -->
  <div class="page">
    <h1>Mapa de Competências</h1>
    ${result.competencies ? `
      <div class="competency-grid">
        ${Object.entries(result.competencies).map(([key, value]: [string, any]) => {
          const level = value > 30 ? 'high' : value > 15 ? 'medium' : 'low';
          const levelText = value > 30 ? 'Alto' : value > 15 ? 'Médio' : 'Baixo';
          return `
            <div class="competency ${level}">
              <strong>${key}</strong><br/>
              ${levelText} (${value})
            </div>
          `;
        }).join('')}
      </div>
    ` : '<p>Dados não disponíveis</p>'}
  </div>

  <!-- PÁGINA 8: VENDAS -->
  ${result.sales_insights ? `
  <div class="page">
    <h1>Insights para Vendas</h1>
    
    ${result.sales_insights.strengths ? `
      <h2>Pontos Fortes</h2>
      <ul>
        ${result.sales_insights.strengths.map((s: string) => `<li>${s}</li>`).join('')}
      </ul>
    ` : ''}
    
    ${result.sales_insights.approach ? `
      <h2>Abordagem de Vendas</h2>
      <p>${result.sales_insights.approach}</p>
    ` : ''}
  </div>
  ` : ''}
</body>
</html>
  `;
}
