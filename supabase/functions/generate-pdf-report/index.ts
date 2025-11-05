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

    // Fetch assessment data
    const { data: assessment, error: assessmentError } = await supabaseClient
      .from('assessments')
      .select('*, campaigns(name)')
      .eq('id', assessment_id)
      .single();

    if (assessmentError) {
      console.error('Error fetching assessment:', assessmentError);
      throw assessmentError;
    }
    
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Fetch results separately
    const { data: result, error: resultError } = await supabaseClient
      .from('results')
      .select('*')
      .eq('assessment_id', assessment_id)
      .single();

    if (resultError) {
      console.error('Error fetching result:', resultError);
      throw resultError;
    }
    
    if (!result) {
      throw new Error('Results not found for this assessment');
    }

    // Validate that we have all required DISC data
    if (result.natural_d === null || result.natural_d === undefined) {
      console.error('Missing DISC data in result:', result);
      throw new Error('Incomplete DISC data - please recalculate results');
    }

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

  const primaryFactor = result.primary_profile === 'Diretor' ? 'D' :
    result.primary_profile === 'Comunicador' ? 'I' :
    result.primary_profile === 'Planejador' ? 'S' : 'C';

  const profileDescriptions = {
    D: {
      howDealsWithProblems: 'Encara problemas como desafios a serem superados rapidamente. Age de forma decisiva e direta, buscando soluções imediatas e resultados tangíveis. Prefere assumir o controle da situação.',
      developmentPoints: ['Desenvolver paciência', 'Melhorar escuta ativa', 'Ser menos impulsivo', 'Dar atenção aos detalhes', 'Considerar impacto nas pessoas'],
      communicationTips: 'Seja direto e objetivo. Foque em resultados e eficiência. Apresente opções e permita que tome decisões. Evite rodeios ou detalhes desnecessários.'
    },
    I: {
      howDealsWithProblems: 'Aborda problemas de forma otimista e colaborativa. Busca envolver outras pessoas e criar soluções criativas. Pode subestimar a complexidade de situações difíceis.',
      developmentPoints: ['Melhorar organização', 'Focar em detalhes importantes', 'Ser mais objetivo', 'Cumprir prazos consistentemente', 'Ouvir mais, falar menos'],
      communicationTips: 'Seja amigável e entusiasta. Permita interação social e troca de ideias. Reconheça suas contribuições. Evite ser muito formal ou crítico.'
    },
    S: {
      howDealsWithProblems: 'Analisa problemas com calma e paciência. Busca soluções que mantenham harmonia e estabilidade. Pode demorar para agir em situações que requerem mudanças rápidas.',
      developmentPoints: ['Ser mais assertivo', 'Aceitar mudanças mais facilmente', 'Tomar decisões mais rápidas', 'Lidar melhor com conflitos', 'Sair da zona de conforto'],
      communicationTips: 'Seja paciente e cordial. Dê tempo para processar informações. Mostre apoio e segurança. Evite pressão ou mudanças abruptas.'
    },
    C: {
      howDealsWithProblems: 'Analisa problemas com precisão e lógica. Busca entender todas as variáveis antes de agir. Foca em encontrar a solução mais correta e precisa, mesmo que demore mais.',
      developmentPoints: ['Ser menos perfeccionista', 'Tomar decisões mais rápidas', 'Aceitar imperfeições', 'Ser mais flexível', 'Melhorar habilidades sociais'],
      communicationTips: 'Seja lógico e preciso. Apresente dados e evidências. Dê tempo para análise. Respeite a necessidade de qualidade. Evite pressão por decisões rápidas.'
    }
  };

  const currentProfile = profileDescriptions[primaryFactor];

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Perfil Comportamental - CIS Assessment</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { margin: 0; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      color: #1e293b; 
      line-height: 1.6; 
      background: white;
    }
    .page { 
      width: 210mm; 
      min-height: 297mm; 
      padding: 25mm 20mm; 
      page-break-after: always; 
      background: white;
      position: relative;
    }
    .header-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 8mm;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
    }
    .footer {
      position: absolute;
      bottom: 15mm;
      left: 20mm;
      right: 20mm;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
    
    /* CAPA */
    .cover { 
      display: flex; 
      flex-direction: column; 
      justify-content: center; 
      align-items: center; 
      text-align: center;
      min-height: 240mm;
      background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);
    }
    .cover-logo {
      font-size: 64px;
      font-weight: 900;
      background: linear-gradient(135deg, #1e3a8a, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 30px;
    }
    .cover h1 { 
      font-size: 42px; 
      color: #1e293b; 
      margin-bottom: 15px;
      font-weight: 700;
      line-height: 1.2;
    }
    .cover h2 { 
      font-size: 28px; 
      color: #3b82f6; 
      margin: 25px 0;
      font-weight: 600;
    }
    .cover p { 
      font-size: 14px; 
      color: #64748b; 
      margin: 8px 0;
    }
    .cover .date {
      margin-top: 40px;
      font-size: 12px;
      color: #94a3b8;
    }
    
    /* TIPOGRAFIA */
    h1 { 
      font-size: 28px; 
      color: #1e293b; 
      margin-bottom: 18px; 
      border-bottom: 3px solid #3b82f6; 
      padding-bottom: 8px;
      font-weight: 700;
    }
    h2 { 
      font-size: 20px; 
      color: #1e293b; 
      margin: 18px 0 12px;
      font-weight: 600;
    }
    h3 { 
      font-size: 16px; 
      color: #475569; 
      margin: 14px 0 8px;
      font-weight: 600;
    }
    p, li { 
      font-size: 11px; 
      color: #475569; 
      margin: 6px 0;
      line-height: 1.7;
    }
    
    /* GRÁFICOS DISC */
    .disc-comparison {
      display: flex;
      gap: 30px;
      margin: 25px 0;
    }
    .disc-section {
      flex: 1;
    }
    .disc-bar { 
      display: flex; 
      gap: 12px; 
      margin: 20px 0;
      justify-content: space-around;
    }
    .bar { 
      flex: 1;
      max-width: 80px;
      text-align: center;
    }
    .bar-container {
      height: 180px;
      background: #f1f5f9;
      position: relative;
      display: flex;
      flex-direction: column-reverse;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .bar-fill { 
      display: flex;
      align-items: center;
      justify-content: center;
      color: white; 
      font-weight: 700;
      font-size: 14px;
      transition: all 0.3s ease;
    }
    .bar-label { 
      margin-top: 10px; 
      font-weight: 700;
      font-size: 14px;
    }
    .bar-value {
      margin-top: 4px;
      font-size: 11px;
      color: #64748b;
    }
    
    /* CARDS E BOXES */
    .info-box {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 18px;
      border-radius: 10px;
      margin: 15px 0;
      border-left: 4px solid #3b82f6;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .info-box strong {
      color: #1e293b;
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
    }
    
    .grid-2 { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 15px;
      margin: 20px 0;
    }
    .grid-3 { 
      display: grid; 
      grid-template-columns: 1fr 1fr 1fr; 
      gap: 12px;
      margin: 20px 0;
    }
    .card {
      padding: 14px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .card strong {
      display: block;
      color: #1e293b;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .card-value {
      font-size: 20px;
      font-weight: 700;
      color: #3b82f6;
    }
    
    /* COMPETÊNCIAS */
    .competency { 
      padding: 12px; 
      border-radius: 8px; 
      text-align: center; 
      font-size: 10px;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .high { background: linear-gradient(135deg, #dcfce7, #bbf7d0); color: #166534; }
    .medium { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #854d0e; }
    .low { background: linear-gradient(135deg, #fee2e2, #fecaca); color: #991b1b; }
    
    /* LISTAS */
    ul { 
      padding-left: 20px;
      margin: 12px 0;
    }
    li {
      margin: 6px 0;
      line-height: 1.6;
    }
    
    /* TABELAS */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 11px;
    }
    th {
      background: #f1f5f9;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      color: #1e293b;
      border-bottom: 2px solid #3b82f6;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:hover {
      background: #f8fafc;
    }
    
    /* BADGES */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      margin: 4px;
    }
    .badge-primary { background: #dbeafe; color: #1e40af; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #854d0e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    
    /* ÍNDICE */
    .toc-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px dotted #cbd5e1;
      font-size: 12px;
    }
    .toc-item:hover {
      background: #f8fafc;
      padding-left: 8px;
    }
  </style>
</head>
<body>
  <!-- PÁGINA 1: CAPA -->
  <div class="page cover">
    <div class="cover-logo">CIS</div>
    <h1>Mapeamento de Perfil<br/>Comportamental</h1>
    <h2>${assessment.candidate_name || 'Candidato'}</h2>
    <p style="font-size: 15px; margin-top: 20px;"><strong>Solicitado por:</strong> ${assessment.campaigns?.name || 'Organização'}</p>
    <p class="date">Data: ${new Date(assessment.completed_at || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  </div>

  <!-- PÁGINA 2: ÍNDICE -->
  <div class="page">
    <div class="header-bar"></div>
    <h1>Índice</h1>
    <div style="margin-top: 30px;">
      <div class="toc-item"><span>1. Metodologia DISC</span><span>3</span></div>
      <div class="toc-item"><span>2. Intensidade do Perfil</span><span>4</span></div>
      <div class="toc-item"><span>3. Como Lida com Problemas</span><span>5</span></div>
      <div class="toc-item"><span>4. Pontos a Desenvolver</span><span>6</span></div>
      <div class="toc-item"><span>5. Tipos Psicológicos (Jung)</span><span>7</span></div>
      <div class="toc-item"><span>6. Teoria de Valores</span><span>8</span></div>
      <div class="toc-item"><span>7. Estilo de Liderança</span><span>9</span></div>
      <div class="toc-item"><span>8. Mapa de Competências</span><span>10</span></div>
      <div class="toc-item"><span>9. Insights para Vendas</span><span>11</span></div>
      <div class="toc-item"><span>10. Sugestões de Comunicação</span><span>12</span></div>
    </div>
    <div class="footer">© ${new Date().getFullYear()} CIS Assessment - Relatório Confidencial</div>
  </div>

  <!-- PÁGINA 3: METODOLOGIA DISC -->
  <div class="page">
    <div class="header-bar"></div>
    <h1>Relatório Comportamental - CIS Assessment</h1>
    
    <div class="info-box" style="margin-top: 25px;">
      <p><strong>O que é o CIS Assessment?</strong></p>
      <p>O CIS Assessment é uma ferramenta completa de mapeamento comportamental que analisa 6 dimensões fundamentais da personalidade: DISC, Valores, Tipos Junguianos, Estilos de Liderança, Competências e Potencial para Vendas.</p>
    </div>

    <h2 style="margin-top: 30px;">Metodologia DISC</h2>
    <p>Criada pelo psicólogo William Moulton Marston em 1928, a metodologia DISC é uma das ferramentas de avaliação comportamental mais utilizadas no mundo. Identifica 4 fatores principais:</p>
    
    <div class="grid-2" style="margin-top: 20px;">
      <div class="card" style="border-left: 4px solid ${discColors['D']}">
        <h3 style="color: ${discColors['D']}; margin-top: 0;">D - Dominância</h3>
        <p><strong>Foco:</strong> Resultados e realização</p>
        <p><strong>Características:</strong> Direto, decidido, competitivo, orientado para ação</p>
        <p><strong>Motivação:</strong> Desafios, autonomia, vitórias</p>
      </div>
      
      <div class="card" style="border-left: 4px solid ${discColors['I']}">
        <h3 style="color: ${discColors['I']}; margin-top: 0;">I - Influência</h3>
        <p><strong>Foco:</strong> Relacionamentos e persuasão</p>
        <p><strong>Características:</strong> Comunicativo, entusiasta, sociável, otimista</p>
        <p><strong>Motivação:</strong> Reconhecimento, interação social</p>
      </div>
      
      <div class="card" style="border-left: 4px solid ${discColors['S']}">
        <h3 style="color: ${discColors['S']}; margin-top: 0;">S - Estabilidade</h3>
        <p><strong>Foco:</strong> Cooperação e harmonia</p>
        <p><strong>Características:</strong> Paciente, leal, calmo, confiável</p>
        <p><strong>Motivação:</strong> Estabilidade, trabalho em equipe</p>
      </div>
      
      <div class="card" style="border-left: 4px solid ${discColors['C']}">
        <h3 style="color: ${discColors['C']}; margin-top: 0;">C - Conformidade</h3>
        <p><strong>Foco:</strong> Qualidade e precisão</p>
        <p><strong>Características:</strong> Analítico, detalhista, sistemático, preciso</p>
        <p><strong>Motivação:</strong> Excelência, padrões altos</p>
      </div>
    </div>

    <div class="info-box" style="margin-top: 25px; border-left-color: #10b981;">
      <p><strong>Natural vs. Adaptado</strong></p>
      <p><strong>Perfil Natural:</strong> Representa quem você realmente é - seu comportamento espontâneo e natural.</p>
      <p><strong>Perfil Adaptado:</strong> Representa como você se comporta no ambiente de trabalho - adaptações conscientes e inconscientes ao ambiente profissional.</p>
      <p><strong>Tensão:</strong> A diferença entre os dois perfis indica o nível de adaptação/esforço necessário.</p>
    </div>
    
    <div class="footer">© ${new Date().getFullYear()} CIS Assessment - Relatório Confidencial - Página 3</div>
  </div>

  <!-- PÁGINA 4: INTENSIDADE DO PERFIL -->
  <div class="page">
    <div class="header-bar"></div>
    <h1>Intensidade do Perfil DISC</h1>
    
    <div class="disc-comparison">
      <div class="disc-section">
        <h2 style="text-align: center;">Perfil Natural</h2>
        <p style="text-align: center; font-size: 10px; color: #64748b; margin-bottom: 15px;">Como você realmente é</p>
        <div class="disc-bar">
          ${['D', 'I', 'S', 'C'].map(factor => {
            const key = `natural_${factor.toLowerCase()}`;
            const value = result[key] || 0;
            const percentage = Math.round((value / 40) * 100);
            return `
            <div class="bar">
              <div class="bar-container">
                <div class="bar-fill" style="height: ${percentage}%; background: ${discColors[factor]}">
                  ${value}
                </div>
              </div>
              <div class="bar-label" style="color: ${discColors[factor]}">${factor}</div>
              <div class="bar-value">${percentage}%</div>
            </div>
          `;
          }).join('')}
        </div>
      </div>

      <div class="disc-section">
        <h2 style="text-align: center;">Perfil Adaptado</h2>
        <p style="text-align: center; font-size: 10px; color: #64748b; margin-bottom: 15px;">Como você age no trabalho</p>
        <div class="disc-bar">
          ${['D', 'I', 'S', 'C'].map(factor => {
            const key = `adapted_${factor.toLowerCase()}`;
            const value = result[key] || 0;
            const percentage = Math.round((value / 40) * 100);
            return `
            <div class="bar">
              <div class="bar-container">
                <div class="bar-fill" style="height: ${percentage}%; background: ${discColors[factor]}">
                  ${value}
                </div>
              </div>
              <div class="bar-label" style="color: ${discColors[factor]}">${factor}</div>
              <div class="bar-value">${percentage}%</div>
            </div>
          `;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-top: 30px;">
      <div class="info-box">
        <strong>Perfil Primário</strong>
        <p style="font-size: 20px; color: #3b82f6; font-weight: 700; margin-top: 8px;">${result.primary_profile || 'N/A'}</p>
      </div>
      <div class="info-box">
        <strong>Perfil Secundário</strong>
        <p style="font-size: 20px; color: #3b82f6; font-weight: 700; margin-top: 8px;">${result.secondary_profile || 'Não identificado'}</p>
      </div>
    </div>

    <div class="info-box" style="margin-top: 15px; border-left-color: ${result.tension_level === 'high' ? '#ef4444' : result.tension_level === 'moderate' ? '#f59e0b' : '#10b981'};">
      <strong>Nível de Tensão: ${result.tension_level === 'high' ? 'Alto' : result.tension_level === 'moderate' ? 'Moderado' : 'Baixo'}</strong>
      <p>${result.tension_level === 'high' ? 
        'Há uma diferença significativa entre seu perfil natural e adaptado. Isso pode indicar esforço considerável para se adaptar ao ambiente de trabalho. Considere avaliar se o ambiente está alinhado com suas características naturais.' : 
        result.tension_level === 'moderate' ? 
        'Existe alguma diferença entre seu perfil natural e adaptado, mas dentro de níveis saudáveis de adaptação profissional.' : 
        'Seu perfil natural e adaptado estão muito alinhados, indicando que você se sente confortável sendo você mesmo no ambiente de trabalho.'
      }</p>
    </div>
    
    <div class="footer">© ${new Date().getFullYear()} CIS Assessment - Relatório Confidencial - Página 4</div>
  </div>

  <!-- PÁGINA 5: COMO LIDA COM PROBLEMAS -->
  <div class="page">
    <div class="header-bar"></div>
    <h1>Como ${assessment.candidate_name?.split(' ')[0] || 'Você'} Lida com Problemas e Desafios</h1>
    
    <div class="info-box" style="margin-top: 25px;">
      <h3 style="margin-top: 0;">Abordagem Característica</h3>
      <p style="font-size: 12px; line-height: 1.8;">${currentProfile.howDealsWithProblems}</p>
    </div>

    <h2 style="margin-top: 30px;">Estratégias Recomendadas</h2>
    <table style="margin-top: 15px;">
      <tr>
        <th style="width: 50%;">Aproveite Seus Pontos Fortes</th>
        <th style="width: 50%;">Desenvolva Estas Áreas</th>
      </tr>
      <tr>
        <td style="vertical-align: top;">
          <ul>
            ${result.primary_profile === 'Diretor' ? `
              <li>Capacidade de tomar decisões rápidas</li>
              <li>Foco em resultados tangíveis</li>
              <li>Coragem para enfrentar desafios</li>
              <li>Iniciativa e proatividade</li>
            ` : result.primary_profile === 'Comunicador' ? `
              <li>Habilidade de mobilizar pessoas</li>
              <li>Criatividade para soluções inovadoras</li>
              <li>Otimismo e energia</li>
              <li>Networking e relacionamentos</li>
            ` : result.primary_profile === 'Planejador' ? `
              <li>Paciência para análise cuidadosa</li>
              <li>Capacidade de manter a calma</li>
              <li>Foco na harmonia da equipe</li>
              <li>Lealdade e persistência</li>
            ` : `
              <li>Análise detalhada e precisa</li>
              <li>Foco em qualidade</li>
              <li>Pensamento lógico e sistemático</li>
              <li>Atenção aos detalhes</li>
            `}
          </ul>
        </td>
        <td style="vertical-align: top; background: #fef3c7;">
          <ul>
            ${currentProfile.developmentPoints.slice(0, 4).map(point => `<li>${point}</li>`).join('')}
          </ul>
        </td>
      </tr>
    </table>

    <div class="info-box" style="margin-top: 25px; border-left-color: #f59e0b;">
      <strong>⚠️ Atenção em Situações de Estresse</strong>
      <p>${result.primary_profile === 'Diretor' ? 
        'Sob pressão, pode se tornar excessivamente autoritário e impaciente. Lembre-se de ouvir os outros e considerar diferentes perspectivas.' :
        result.primary_profile === 'Comunicador' ?
        'Sob pressão, pode perder o foco e se tornar desorganizado. Mantenha listas de prioridades e peça ajuda para detalhes importantes.' :
        result.primary_profile === 'Planejador' ?
        'Sob pressão, pode evitar conflitos necessários e ter dificuldade com mudanças urgentes. Pratique assertividade e flexibilidade.' :
        'Sob pressão, pode se tornar excessivamente crítico e perfeccionista, causando paralisia por análise. Estabeleça prazos e aceite "bom o suficiente".'
      }</p>
    </div>
    
    <div class="footer">© ${new Date().getFullYear()} CIS Assessment - Relatório Confidencial - Página 5</div>
  </div>

  <!-- PÁGINA 6: PONTOS A DESENVOLVER -->
  <div class="page">
    <div class="header-bar"></div>
    <h1>Plano de Desenvolvimento Pessoal</h1>
    
    <h2 style="margin-top: 25px;">Áreas Prioritárias para Desenvolvimento</h2>
    
    <div class="grid-2" style="margin-top: 20px;">
      ${currentProfile.developmentPoints.map((point, index) => `
        <div class="card" style="border-left: 4px solid ${index < 2 ? '#ef4444' : '#f59e0b'}">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="background: ${index < 2 ? '#fee2e2' : '#fef3c7'}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: ${index < 2 ? '#991b1b' : '#854d0e'};">
              ${index + 1}
            </div>
            <strong style="flex: 1;">${point}</strong>
          </div>
        </div>
      `).join('')}
    </div>

    <h2 style="margin-top: 30px;">Ações Práticas Sugeridas</h2>
    
    <div style="margin-top: 15px;">
      ${result.primary_profile === 'Diretor' ? `
        <div class="info-box">
          <strong>1. Desenvolver Empatia e Escuta Ativa</strong>
          <p>• Reserve tempo específico para ouvir sua equipe sem interromper</p>
          <p>• Faça perguntas abertas: "O que você pensa sobre isso?"</p>
          <p>• Conte até 3 antes de responder em reuniões</p>
        </div>
        <div class="info-box">
          <strong>2. Melhorar Paciência com Processos</strong>
          <p>• Pratique mindfulness ou meditação por 5 minutos diários</p>
          <p>• Delegue tarefas detalhadas para pessoas C ou S</p>
          <p>• Estabeleça checkpoints ao invés de cobrar resultado final imediato</p>
        </div>
      ` : result.primary_profile === 'Comunicador' ? `
        <div class="info-box">
          <strong>1. Melhorar Organização e Foco</strong>
          <p>• Use técnica Pomodoro: 25 minutos de foco, 5 de pausa</p>
          <p>• Mantenha uma lista de tarefas diária (máximo 5 itens prioritários)</p>
          <p>• Desligue notificações durante trabalho focado</p>
        </div>
        <div class="info-box">
          <strong>2. Desenvolver Atenção aos Detalhes</strong>
          <p>• Revise documentos importantes após 1 hora de tê-los escrito</p>
          <p>• Peça feedback de colegas C sobre qualidade do trabalho</p>
          <p>• Crie checklists para tarefas recorrentes</p>
        </div>
      ` : result.primary_profile === 'Planejador' ? `
        <div class="info-box">
          <strong>1. Desenvolver Assertividade</strong>
          <p>• Pratique dizer "não" para pequenas solicitações esta semana</p>
          <p>• Expresse sua opinião pelo menos uma vez em cada reunião</p>
          <p>• Use a fórmula: "Eu sinto... quando... porque... eu gostaria..."</p>
        </div>
        <div class="info-box">
          <strong>2. Aumentar Adaptabilidade a Mudanças</strong>
          <p>• Faça pequenas mudanças intencionais (rota para o trabalho, ordem de tarefas)</p>
          <p>• Veja mudanças como oportunidades de aprendizado</p>
          <p>• Foque no que você pode controlar em situações de incerteza</p>
        </div>
      ` : `
        <div class="info-box">
          <strong>1. Reduzir Perfeccionismo</strong>
          <p>• Estabeleça "done is better than perfect" como mantra</p>
          <p>• Defina critérios claros de "bom o suficiente" antes de começar</p>
          <p>• Use timers: quando acabar o tempo, entregue como está</p>
        </div>
        <div class="info-box">
          <strong>2. Melhorar Relacionamento Interpessoal</strong>
          <p>• Inicie conversas informais com colegas (2-3x por semana)</p>
          <p>• Compartilhe algo pessoal em reuniões de equipe</p>
          <p>• Participe de eventos sociais da empresa</p>
        </div>
      `}
    </div>
    
    <div class="footer">© ${new Date().getFullYear()} CIS Assessment - Relatório Confidencial - Página 6</div>
  </div>

  <!-- PÁGINA 7: TIPO JUNGIANO -->
  <div class="page">
    <div class="header-bar"></div>
    <h1>Tipos Psicológicos de Jung</h1>
    
    ${result.jung_type ? `
      <div class="info-box" style="margin-top: 25px;">
        <h2 style="margin-top: 0;">Seu Tipo: <span style="font-size: 36px; color: #3b82f6;">${result.jung_type.type || 'N/A'}</span></h2>
      </div>

      <h2 style="margin-top: 30px;">Análise Detalhada</h2>
      
      <div class="grid-2" style="margin-top: 20px;">
        <div class="card" style="border-left: 4px solid ${result.jung_type.extroversion > result.jung_type.introversion ? '#3b82f6' : '#64748b'}">
          <strong>Atitude Predominante</strong>
          <p style="font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 8px;">
            ${result.jung_type.extroversion > result.jung_type.introversion ? 'Extroversão' : 'Introversão'}
          </p>
          <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 10px;">
            <span>Extroversão: ${result.jung_type.extroversion || 0}</span>
            <span>Introversão: ${result.jung_type.introversion || 0}</span>
          </div>
        </div>
        
        <div class="card" style="border-left: 4px solid ${result.jung_type.intuition > result.jung_type.sensing ? '#10b981' : '#64748b'}">
          <strong>Função de Percepção</strong>
          <p style="font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 8px;">
            ${result.jung_type.intuition > result.jung_type.sensing ? 'Intuição' : 'Sensação'}
          </p>
          <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 10px;">
            <span>Intuição: ${result.jung_type.intuition || 0}</span>
            <span>Sensação: ${result.jung_type.sensing || 0}</span>
          </div>
        </div>
        
        <div class="card" style="border-left: 4px solid ${result.jung_type.thinking > result.jung_type.feeling ? '#f59e0b' : '#64748b'}">
          <strong>Função de Julgamento</strong>
          <p style="font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 8px;">
            ${result.jung_type.thinking > result.jung_type.feeling ? 'Pensamento' : 'Sentimento'}
          </p>
          <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 10px;">
            <span>Pensamento: ${result.jung_type.thinking || 0}</span>
            <span>Sentimento: ${result.jung_type.feeling || 0}</span>
          </div>
        </div>
        
        <div class="card" style="border-left: 4px solid #8b5cf6">
          <strong>Estilo de Vida</strong>
          <p style="font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 8px;">
            ${result.jung_type.type?.endsWith('J') ? 'Julgamento (Estruturado)' : 'Percepção (Flexível)'}
          </p>
        </div>
      </div>

      <h2 style="margin-top: 30px;">O que isso significa?</h2>
      
      <div class="info-box">
        <p><strong>${result.jung_type.extroversion > result.jung_type.introversion ? 'Extroversão' : 'Introversão'}:</strong> 
        ${result.jung_type.extroversion > result.jung_type.introversion ? 
          'Você ganha energia através da interação social e do mundo exterior. Prefere processar pensamentos externamente, através da fala.' :
          'Você ganha energia através da reflexão e do mundo interior. Prefere processar pensamentos internamente antes de compartilhar.'
        }</p>
      </div>
      
      <div class="info-box">
        <p><strong>${result.jung_type.intuition > result.jung_type.sensing ? 'Intuição' : 'Sensação'}:</strong> 
        ${result.jung_type.intuition > result.jung_type.sensing ? 
          'Você foca no panorama geral, possibilidades futuras e conexões abstratas. Confia na intuição e insights.' :
          'Você foca em fatos concretos, experiências práticas e detalhes do presente. Confia nos cinco sentidos.'
        }</p>
      </div>
      
      <div class="info-box">
        <p><strong>${result.jung_type.thinking > result.jung_type.feeling ? 'Pensamento' : 'Sentimento'}:</strong> 
        ${result.jung_type.thinking > result.jung_type.feeling ? 
          'Você toma decisões baseadas em lógica, análise objetiva e princípios. Valoriza justiça e verdade.' :
          'Você toma decisões baseadas em valores pessoais, harmonia e impacto nas pessoas. Valoriza empatia e consideração.'
        }</p>
      </div>
    ` : '<p>Dados não disponíveis</p>'}
    
    <div class="footer">© ${new Date().getFullYear()} CIS Assessment - Relatório Confidencial - Página 7</div>
  </div>

  <!-- PÁGINA 8: VALORES -->
  <div class="page">
    <div class="header-bar"></div>
    <h1>Teoria de Valores - Eduard Spranger</h1>
    
    <p style="margin-top: 20px;">Os valores representam o que motiva e impulsiona suas decisões e comportamentos. Eduard Spranger identificou 6 valores fundamentais:</p>
    
    ${result.values_scores ? `
      <div class="grid-2" style="margin-top: 25px;">
        ${Object.entries(result.values_scores)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([key, value], index) => {
            const valueName = key === 'theoretical' ? 'Teórico' :
              key === 'economic' ? 'Econômico' :
              key === 'aesthetic' ? 'Estético' :
              key === 'social' ? 'Social' :
              key === 'political' ? 'Político' : 'Espiritual';
            
            const valueDesc = key === 'theoretical' ? 'Busca por conhecimento e verdade' :
              key === 'economic' ? 'Foco em resultados práticos e ROI' :
              key === 'aesthetic' ? 'Valorização de beleza e harmonia' :
              key === 'social' ? 'Desejo de ajudar os outros' :
              key === 'political' ? 'Busca por influência e poder' : 'Conexão com propósito maior';
            
            const percentage = Math.round(((value as number) / 60) * 100);
            const priority = index < 2 ? 'high' : index < 4 ? 'medium' : 'low';
            
            return `
              <div class="card ${priority}" style="border-left: 4px solid ${index < 2 ? '#3b82f6' : index < 4 ? '#10b981' : '#94a3b8'}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong>${valueName}</strong>
                  <span class="badge badge-${priority === 'high' ? 'primary' : priority === 'medium' ? 'success' : 'warning'}">#${index + 1}</span>
                </div>
                <p style="font-size: 10px; color: #64748b; margin-bottom: 10px;">${valueDesc}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; margin-right: 10px; overflow: hidden;">
                    <div style="height: 100%; background: ${index < 2 ? '#3b82f6' : index < 4 ? '#10b981' : '#94a3b8'}; width: ${percentage}%; border-radius: 4px;"></div>
                  </div>
                  <span style="font-size: 12px; font-weight: 700;">${value} <span style="font-size: 9px; color: #64748b;">(${percentage}%)</span></span>
                </div>
              </div>
            `;
          }).join('')}
      </div>

      <h2 style="margin-top: 30px;">Seus Valores Predominantes</h2>
      
      ${Object.entries(result.values_scores)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([key]) => {
          const valueName = key === 'theoretical' ? 'Teórico' :
            key === 'economic' ? 'Econômico' :
            key === 'aesthetic' ? 'Estético' :
            key === 'social' ? 'Social' :
            key === 'political' ? 'Político' : 'Espiritual';
          
          const fullDesc = key === 'theoretical' ? 
            'Você valoriza conhecimento, aprendizado contínuo e descoberta da verdade. Gosta de entender como as coisas funcionam e busca sabedoria. Ambientes que estimulam o intelecto são ideais para você.' :
            key === 'economic' ? 
            'Você valoriza eficiência, retorno sobre investimento e resultados tangíveis. Foca em maximizar recursos e alcançar segurança financeira. Aprecia praticidade e utilidade.' :
            key === 'aesthetic' ? 
            'Você valoriza beleza, harmonia e experiências sensoriais. Busca criar e apreciar arte, design e ambientes inspiradores. A estética e elegância são importantes nas suas escolhas.' :
            key === 'social' ? 
            'Você valoriza ajudar os outros, promover igualdade e contribuir para a sociedade. Foca em relacionamentos genuínos e no bem-estar coletivo. Empatia e compaixão guiam suas ações.' :
            key === 'political' ? 
            'Você valoriza liderança, influência e capacidade de moldar decisões. Busca posições de autoridade e reconhecimento. Gosta de competir e vencer desafios.' :
            'Você valoriza propósito, significado e conexão com algo maior. Busca viver de acordo com princípios morais e éticos. Fé, integridade e transcendência são importantes.';
          
          return `
            <div class="info-box">
              <h3 style="margin-top: 0; color: #3b82f6;">${valueName}</h3>
              <p>${fullDesc}</p>
            </div>
          `;
        }).join('')}
    ` : '<p>Dados não disponíveis</p>'}
    
    <div class="footer">© ${new Date().getFullYear()} CIS Assessment - Relatório Confidencial - Página 8</div>
  </div>

  <!-- PÁGINA 9: LIDERANÇA -->
  <div class="page">
    <div class="header-bar"></div>
    <h1>Estilos de Liderança</h1>
    
    <p style="margin-top: 20px;">Seu perfil DISC revela tendências naturais de liderança. Cada estilo tem seus pontos fortes únicos:</p>
    
    ${result.leadership_style ? `
      <div class="grid-2" style="margin-top: 25px;">
        ${Object.entries(result.leadership_style)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([key, value], index) => {
            const styleName = key === 'executive' ? 'Executivo' :
              key === 'motivator' ? 'Motivador' :
              key === 'systematic' ? 'Sistemático' : 'Metódico';
            
            const styleDesc = key === 'executive' ? 'Decisivo, orientado para resultados, assume comando' :
              key === 'motivator' ? 'Inspirador, energizante, constrói relacionamentos' :
              key === 'systematic' ? 'Paciente, colaborativo, mantém estabilidade' : 'Analítico, preciso, focado em qualidade';
            
            const color = key === 'executive' ? '#ef4444' :
              key === 'motivator' ? '#f59e0b' :
              key === 'systematic' ? '#10b981' : '#3b82f6';
            
            const percentage = Math.round(((value as number) / 40) * 100);
            
            return `
              <div class="card" style="border-left: 4px solid ${color}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <strong style="font-size: 13px;">${styleName}</strong>
                  <span class="badge" style="background: ${color}20; color: ${color};">#${index + 1}</span>
                </div>
                <p style="font-size: 10px; color: #64748b; margin-bottom: 12px;">${styleDesc}</p>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="flex: 1; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                    <div style="height: 100%; background: ${color}; width: ${percentage}%; border-radius: 5px;"></div>
                  </div>
                  <span style="font-size: 14px; font-weight: 700; color: ${color}; min-width: 45px;">${percentage}%</span>
                </div>
              </div>
            `;
          }).join('')}
      </div>

      <h2 style="margin-top: 30px;">Seu Estilo Predominante</h2>
      
      ${(() => {
        const dominant = Object.entries(result.leadership_style)
          .sort(([, a], [, b]) => (b as number) - (a as number))[0];
        const [key, value] = dominant;
        
        if (key === 'executive') {
          return `
            <div class="info-box">
              <h3 style="margin-top: 0; color: #ef4444;">Liderança Executiva</h3>
              <p><strong>Características:</strong> Você lidera pelo exemplo, tomando decisões rápidas e focando em resultados. É direto, confiante e não teme desafios.</p>
              <p><strong>Pontos Fortes:</strong> Capacidade de tomar decisões difíceis, visão estratégica, coragem para assumir riscos calculados.</p>
              <p><strong>Desenvolvimento:</strong> Pratique escuta ativa, envolva mais a equipe nas decisões, demonstre vulnerabilidade quando apropriado.</p>
            </div>
          `;
        } else if (key === 'motivator') {
          return `
            <div class="info-box">
              <h3 style="margin-top: 0; color: #f59e0b;">Liderança Motivadora</h3>
              <p><strong>Características:</strong> Você lidera inspirando e energizando as pessoas. Cria um ambiente positivo e constrói relacionamentos fortes.</p>
              <p><strong>Pontos Fortes:</strong> Comunicação persuasiva, capacidade de motivar equipes, otimismo contagiante, networking eficaz.</p>
              <p><strong>Desenvolvimento:</strong> Melhore follow-through, foque em resultados mensuráveis, preste atenção a detalhes importantes.</p>
            </div>
          `;
        } else if (key === 'systematic') {
          return `
            <div class="info-box">
              <h3 style="margin-top: 0; color: #10b981;">Liderança Sistemática</h3>
              <p><strong>Características:</strong> Você lidera com paciência e consistência, criando um ambiente estável e colaborativo. Foco em processos e harmonia.</p>
              <p><strong>Pontos Fortes:</strong> Construção de equipes coesas, paciência com pessoas, manutenção de processos, lealdade da equipe.</p>
              <p><strong>Desenvolvimento:</strong> Seja mais assertivo quando necessário, acelere tomada de decisões, pratique dar feedback difícil.</p>
            </div>
          `;
        } else {
          return `
            <div class="info-box">
              <h3 style="margin-top: 0; color: #3b82f6;">Liderança Metódica</h3>
              <p><strong>Características:</strong> Você lidera através de planejamento cuidadoso, análise detalhada e padrões de qualidade elevados.</p>
              <p><strong>Pontos Fortes:</strong> Atenção aos detalhes, planejamento estratégico, foco em qualidade, pensamento analítico.</p>
              <p><strong>Desenvolvimento:</strong> Delegue mais, aceite "bom o suficiente" quando apropriado, seja mais flexível com imprevistos.</p>
            </div>
          `;
        }
      })()}
      
      <div class="info-box" style="margin-top: 20px; border-left-color: #8b5cf6;">
        <strong>💡 Dica: Liderança Situacional</strong>
        <p>Os melhores líderes adaptam seu estilo à situação e à equipe. Use seu estilo predominante como base, mas desenvolva flexibilidade para aplicar outros estilos quando necessário.</p>
      </div>
    ` : '<p>Dados não disponíveis</p>'}
    
    <div class="footer">© ${new Date().getFullYear()} CIS Assessment - Relatório Confidencial - Página 9</div>
  </div>

  <!-- PÁGINA 10: COMPETÊNCIAS -->
  <div class="page">
    <div class="header-bar"></div>
    <h1>Mapa de Competências Comportamentais</h1>
    
    ${result.competencies ? `
      <h2 style="margin-top: 25px;">Competências Naturais</h2>
      <div class="grid-3" style="margin-top: 15px;">
        ${Object.entries(result.competencies)
          .filter(([key]) => key.endsWith('_n'))
          .slice(0, 12)
          .map(([key, value]: [string, any]) => {
            const level = value > 30 ? 'high' : value > 15 ? 'medium' : 'low';
            const levelText = value > 30 ? 'Alto' : value > 15 ? 'Médio' : 'Baixo';
            const cleanName = key.replace(/_n$/, '').replace(/_/g, ' ').toUpperCase();
            return `<div class="competency ${level}"><strong>${cleanName}</strong><br/>${levelText} (${value})</div>`;
          }).join('')}
      </div>
    ` : '<p>Dados não disponíveis</p>'}
    
    <div class="footer">© ${new Date().getFullYear()} CIS Assessment - Relatório Confidencial - Página 10</div>
  </div>

  <!-- PÁGINA 11: VENDAS -->
  ${result.sales_insights ? `
  <div class="page">
    <div class="header-bar"></div>
    <h1>Insights para Vendas e Negociação</h1>
    
    <div class="grid-2" style="margin-top: 25px;">
      ${result.sales_insights.strengths ? `
        <div class="card" style="border-left: 4px solid #10b981;">
          <h3 style="margin-top: 0; color: #10b981;">✓ Pontos Fortes em Vendas</h3>
          <ul style="margin-top: 10px;">
            ${result.sales_insights.strengths.map((s: string) => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${result.sales_insights.weaknesses ? `
        <div class="card" style="border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #f59e0b;">⚠ Pontos de Atenção</h3>
          <ul style="margin-top: 10px;">
            ${result.sales_insights.weaknesses.map((w: string) => `<li>${w}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
    
    ${result.sales_insights.sales_approach || result.sales_insights.approach ? `
      <div class="info-box" style="margin-top: 20px;">
        <strong>Abordagem de Vendas Recomendada</strong>
        <p style="font-size: 12px; line-height: 1.8;">${result.sales_insights.sales_approach || result.sales_insights.approach}</p>
      </div>
    ` : ''}
    
    ${result.sales_insights.ideal_customer || result.sales_insights.idealCustomer ? `
      <div class="info-box" style="margin-top: 15px; border-left-color: #3b82f6;">
        <strong>Cliente Ideal</strong>
        <p style="font-size: 12px;">${result.sales_insights.ideal_customer || result.sales_insights.idealCustomer}</p>
      </div>
    ` : ''}
    
    <div class="footer">© ${new Date().getFullYear()} CIS Assessment - Relatório Confidencial - Página 11</div>
  </div>
  ` : ''}

  <!-- PÁGINA 12: COMUNICAÇÃO -->
  <div class="page">
    <div class="header-bar"></div>
    <h1>Guia de Comunicação</h1>
    
    <div class="info-box" style="margin-top: 25px; background: linear-gradient(135deg, #dbeafe, #f0f9ff);">
      <h2 style="margin-top: 0; color: #1e40af;">Como se comunicar efetivamente com ${assessment.candidate_name?.split(' ')[0] || 'esta pessoa'}</h2>
      <p style="font-size: 12px; line-height: 1.8; margin-top: 15px;">${currentProfile.communicationTips}</p>
    </div>
    
    <div class="footer">© ${new Date().getFullYear()} CIS Assessment - Relatório Confidencial - Página 12</div>
  </div>
</body>
</html>
  `;
}
