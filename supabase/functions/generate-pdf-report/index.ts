import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
// @deno-types="npm:@types/pdfkit@0.13.5"
import PDFDocument from "npm:pdfkit@0.15.0";
import { Buffer } from "node:buffer";

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
    console.log('Generating PDF for assessment:', assessment_id);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch assessment data
    const { data: assessment, error: assessmentError } = await supabaseClient
      .from('assessments')
      .select('*, campaigns(*)')
      .eq('id', assessment_id)
      .single();

    if (assessmentError || !assessment) {
      throw new Error('Assessment not found');
    }

    // Fetch result data
    const { data: result, error: resultError } = await supabaseClient
      .from('results')
      .select('*')
      .eq('assessment_id', assessment_id)
      .single();

    if (resultError || !result) {
      throw new Error('Result not found');
    }

    console.log('Assessment and result fetched successfully');

    // Generate chart images using the existing function
    const chartImages: Record<string, string> = {};
    
    try {
      // DISC Chart
      const discResponse = await supabaseClient.functions.invoke('generate-chart-image', {
        body: {
          chartType: 'disc-bars',
          data: {
            natural: {
              D: result.natural_d,
              I: result.natural_i,
              S: result.natural_s,
              C: result.natural_c
            },
            adapted: {
              D: result.adapted_d,
              I: result.adapted_i,
              S: result.adapted_s,
              C: result.adapted_c
            }
          },
          title: 'Perfil DISC'
        }
      });
      if (discResponse.data?.imageUrl) {
        chartImages.disc = discResponse.data.imageUrl;
      }
    } catch (e) {
      console.error('Error generating DISC chart:', e);
    }

    try {
      // Values Chart
      if (result.values_scores) {
        const valuesResponse = await supabaseClient.functions.invoke('generate-chart-image', {
          body: {
            chartType: 'values-radar',
            data: result.values_scores,
            title: 'Valores Motivacionais'
          }
        });
        if (valuesResponse.data?.imageUrl) {
          chartImages.values = valuesResponse.data.imageUrl;
        }
      }
    } catch (e) {
      console.error('Error generating Values chart:', e);
    }

    try {
      // Leadership Chart
      if (result.leadership_style) {
        const leadershipResponse = await supabaseClient.functions.invoke('generate-chart-image', {
          body: {
            chartType: 'leadership-pie',
            data: result.leadership_style,
            title: 'Estilo de Liderança'
          }
        });
        if (leadershipResponse.data?.imageUrl) {
          chartImages.leadership = leadershipResponse.data.imageUrl;
        }
      }
    } catch (e) {
      console.error('Error generating Leadership chart:', e);
    }

    try {
      // Competencies Chart
      if (result.competencies) {
        const competenciesResponse = await supabaseClient.functions.invoke('generate-chart-image', {
          body: {
            chartType: 'competencies-bars',
            data: result.competencies,
            title: 'Mapa de Competências'
          }
        });
        if (competenciesResponse.data?.imageUrl) {
          chartImages.competencies = competenciesResponse.data.imageUrl;
        }
      }
    } catch (e) {
      console.error('Error generating Competencies chart:', e);
    }

    console.log('Charts generated, creating PDF document with PDFKit...');

    // Generate PDF using PDFKit
    const pdfBuffer = await generatePDFDocument(assessment, result, chartImages);

    console.log('PDF document generated, uploading to storage...');

    // Upload to Supabase Storage
    const fileName = `reports/${assessment_id}.pdf`;
    const { error: uploadError } = await supabaseClient.storage
      .from('assessment-reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('assessment-reports')
      .getPublicUrl(fileName);

    // Update result with PDF URL
    await supabaseClient
      .from('results')
      .update({ report_url: publicUrl })
      .eq('id', result.id);

    console.log('PDF uploaded successfully:', publicUrl);

    return new Response(
      JSON.stringify({ success: true, pdf_url: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-pdf-report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generatePDFDocument(
  assessment: any,
  result: any,
  chartImages: Record<string, string>
): Promise<Uint8Array> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 56, left: 42, right: 42 }
  });

  const chunks: Uint8Array[] = [];
  doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));

  const primaryColor = '#1e40af';
  const secondaryColor = '#3b82f6';
  const textColor = '#1e293b';
  const lightGray = '#94a3b8';

  // Helper function to add header
  const addHeader = () => {
    doc.fontSize(10)
      .fillColor(lightGray)
      .text('CIS Assessment - Relatório Confidencial', 42, 30, { align: 'right' });
  };

  // Helper function to add footer
  let pageNum = 1;
  const addFooter = () => {
    doc.fontSize(9)
      .fillColor(lightGray)
      .text(
        `© 2025 CIS Assessment - Página ${pageNum}`,
        42,
        doc.page.height - 40,
        { align: 'center' }
      );
    pageNum++;
  };

  // ==================== PÁGINA 1: CAPA ====================
  doc.fontSize(32)
    .fillColor(primaryColor)
    .text('MAPEAMENTO DE PERFIL', 42, 200, { align: 'center' });
  
  doc.fontSize(32)
    .text('COMPORTAMENTAL', 42, 240, { align: 'center' });

  doc.moveDown(3);
  doc.fontSize(22)
    .fillColor(textColor)
    .text(assessment.candidate_name || 'N/A', { align: 'center' });

  doc.moveDown(2);
  doc.fontSize(14)
    .fillColor(lightGray)
    .text(`Campanha: ${assessment.campaigns?.name || 'N/A'}`, { align: 'center' });
  
  doc.moveDown(0.5);
  doc.text(
    `Data: ${new Date(assessment.created_at).toLocaleDateString('pt-BR')}`,
    { align: 'center' }
  );

  addFooter();

  // ==================== PÁGINA 2: ÍNDICE ====================
  doc.addPage();
  addHeader();

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text('Conteúdo', 42, 80);

  doc.moveDown(2);
  const sections = [
    '1. Relatório Comportamental',
    '2. Metodologia DISC',
    '3. Perfil DISC Natural',
    '4. Perfil DISC Adaptado',
    '5. Como Lida com Problemas',
    '6. Pontos a Desenvolver',
    '7. Tipos Psicológicos de Jung',
    '8. Teoria de Valores',
    '9. Estilo de Liderança',
    '10. Mapa de Competências',
    '11. Sugestões para Comunicação',
  ];

  sections.forEach((section, i) => {
    doc.fontSize(13)
      .fillColor(textColor)
      .text(section, 70, 180 + (i * 28));
  });

  addFooter();

  // ==================== PÁGINA 3: RELATÓRIO COMPORTAMENTAL ====================
  doc.addPage();
  addHeader();

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text('RELATÓRIO COMPORTAMENTAL', 42, 80);

  doc.moveDown(2);
  doc.fontSize(12)
    .fillColor(textColor)
    .text(
      'O Relatório CIS Assessment® foi desenvolvido para melhor compreender a personalidade e as potenciais competências dos indivíduos. Através da análise científica do comportamento, valores motivacionais e estilos de liderança, oferecemos insights valiosos para desenvolvimento profissional e formação de equipes de alta performance.',
      { align: 'justify', lineGap: 4 }
    );

  doc.moveDown(2);
  doc.fontSize(16)
    .fillColor(primaryColor)
    .text('Dimensões Avaliadas:', { underline: true });

  doc.moveDown(1);
  const dimensions = [
    '• Perfil DISC (Natural e Adaptado)',
    '• Valores Motivacionais',
    '• Tipos Psicológicos de Jung',
    '• Estilo de Liderança',
    '• Mapa de Competências Comportamentais',
    '• Insights para Comunicação Efetiva'
  ];

  dimensions.forEach(dim => {
    doc.fontSize(12)
      .fillColor(textColor)
      .text(dim, { lineGap: 3 });
  });

  addFooter();

  // ==================== PÁGINA 4: METODOLOGIA DISC ====================
  doc.addPage();
  addHeader();

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text('METODOLOGIA DISC', 42, 80);

  doc.moveDown(2);
  doc.fontSize(12)
    .fillColor(textColor)
    .text(
      'A metodologia DISC foi desenvolvida pelo psicólogo William Moulton Marston na década de 1920. Marston identificou quatro dimensões principais do comportamento humano que formam a base desta avaliação:',
      { align: 'justify', lineGap: 4 }
    );

  doc.moveDown(2);
  doc.fontSize(14)
    .fillColor(secondaryColor)
    .text('D - Dominância:', { continued: true })
    .fontSize(12)
    .fillColor(textColor)
    .text(' Como você lida com problemas e desafios. Pessoas com alto D são assertivas, diretas e focadas em resultados.');

  doc.moveDown(1);
  doc.fontSize(14)
    .fillColor(secondaryColor)
    .text('I - Influência:', { continued: true })
    .fontSize(12)
    .fillColor(textColor)
    .text(' Como você influencia e interage com outras pessoas. Pessoas com alto I são comunicativas, entusiastas e persuasivas.');

  doc.moveDown(1);
  doc.fontSize(14)
    .fillColor(secondaryColor)
    .text('S - Estabilidade:', { continued: true })
    .fontSize(12)
    .fillColor(textColor)
    .text(' Como você responde a mudanças e ritmo. Pessoas com alto S são pacientes, leais e preferem estabilidade.');

  doc.moveDown(1);
  doc.fontSize(14)
    .fillColor(secondaryColor)
    .text('C - Conformidade:', { continued: true })
    .fontSize(12)
    .fillColor(textColor)
    .text(' Como você responde a regras e procedimentos. Pessoas com alto C são analíticas, precisas e seguem padrões de qualidade.');

  doc.moveDown(2);
  doc.fontSize(12)
    .fillColor(textColor)
    .text(
      'Este relatório apresenta dois perfis: Natural (como você realmente é) e Adaptado (como você se comporta no ambiente de trabalho). A diferença entre estes perfis indica o nível de tensão ou adaptação necessária.',
      { align: 'justify', lineGap: 4 }
    );

  addFooter();

  // ==================== PÁGINA 5: PERFIL DISC NATURAL ====================
  doc.addPage();
  addHeader();

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text('PERFIL DISC NATURAL', 42, 80);

  doc.moveDown(1);
  doc.fontSize(12)
    .fillColor(lightGray)
    .text('Como você realmente é', { align: 'center' });

  // Add DISC chart if available
  if (chartImages.disc) {
    try {
      const response = await fetch(chartImages.disc);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      doc.image(buffer, 100, 150, { width: 400 });
    } catch (e) {
      console.error('Error embedding DISC chart:', e);
      doc.moveDown(2);
      doc.fontSize(11).fillColor(lightGray).text('[Gráfico DISC não disponível]', { align: 'center' });
    }
  }

  // Add DISC scores
  doc.moveDown(15);
  doc.fontSize(14)
    .fillColor(textColor)
    .text('Intensidade do Perfil:', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(12)
    .text(`D (Dominância): ${result.natural_d || 0}`)
    .text(`I (Influência): ${result.natural_i || 0}`)
    .text(`S (Estabilidade): ${result.natural_s || 0}`)
    .text(`C (Conformidade): ${result.natural_c || 0}`);

  doc.moveDown(1);
  doc.fontSize(13)
    .fillColor(primaryColor)
    .text(`Perfil Primário: ${result.primary_profile || 'N/A'}`);

  addFooter();

  // ==================== PÁGINA 6: PERFIL DISC ADAPTADO ====================
  doc.addPage();
  addHeader();

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text('PERFIL DISC ADAPTADO', 42, 80);

  doc.moveDown(1);
  doc.fontSize(12)
    .fillColor(lightGray)
    .text('Como você se comporta no ambiente de trabalho', { align: 'center' });

  doc.moveDown(2);
  doc.fontSize(14)
    .fillColor(textColor)
    .text('Intensidade do Perfil Adaptado:', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(12)
    .text(`D (Dominância): ${result.adapted_d || 0}`)
    .text(`I (Influência): ${result.adapted_i || 0}`)
    .text(`S (Estabilidade): ${result.adapted_s || 0}`)
    .text(`C (Conformidade): ${result.adapted_c || 0}`);

  doc.moveDown(2);
  doc.fontSize(13)
    .fillColor(secondaryColor)
    .text(`Nível de Tensão: ${result.tension_level || 'N/A'}`);

  doc.moveDown(1);
  doc.fontSize(11)
    .fillColor(textColor)
    .text(
      'O nível de tensão indica o quanto você precisa se adaptar no ambiente de trabalho. Quanto maior a diferença entre o perfil natural e adaptado, maior o nível de energia necessário para manter essa adaptação.',
      { align: 'justify', lineGap: 3 }
    );

  addFooter();

  // ==================== PÁGINA 7: COMO LIDA COM PROBLEMAS ====================
  doc.addPage();
  addHeader();

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text('COMO LIDA COM PROBLEMAS', 42, 80);

  doc.moveDown(2);
  doc.fontSize(12)
    .fillColor(textColor)
    .text(
      'Baseado no seu perfil DISC, aqui estão as características de como você naturalmente aborda problemas e desafios:',
      { align: 'justify', lineGap: 4 }
    );

  doc.moveDown(2);
  const problemApproach = [
    'Prefere analisar situações antes de tomar decisões',
    'Busca consenso e harmonia na resolução de conflitos',
    'Valoriza processos estruturados e bem definidos',
    'Mantém a calma em situações de pressão',
    'Considera o impacto das decisões nas pessoas envolvidas'
  ];

  problemApproach.forEach(item => {
    doc.fontSize(12)
      .fillColor(textColor)
      .text(`• ${item}`, { lineGap: 3 });
  });

  addFooter();

  // ==================== PÁGINA 8: PONTOS A DESENVOLVER ====================
  doc.addPage();
  addHeader();

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text('PONTOS A DESENVOLVER', 42, 80);

  doc.moveDown(2);
  doc.fontSize(12)
    .fillColor(textColor)
    .text(
      'Áreas de desenvolvimento identificadas para potencializar sua performance:',
      { align: 'justify', lineGap: 4 }
    );

  doc.moveDown(2);
  const developmentPoints = [
    'Trabalhar a assertividade em situações de conflito',
    'Desenvolver habilidades de tomada de decisão rápida',
    'Aumentar a flexibilidade para lidar com mudanças inesperadas',
    'Melhorar a comunicação direta e objetiva',
    'Fortalecer a capacidade de delegação'
  ];

  developmentPoints.forEach(item => {
    doc.fontSize(12)
      .fillColor(textColor)
      .text(`• ${item}`, { lineGap: 3 });
  });

  addFooter();

  // ==================== PÁGINA 9: TIPOS PSICOLÓGICOS DE JUNG ====================
  doc.addPage();
  addHeader();

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text('TIPOS PSICOLÓGICOS', 42, 80);

  doc.moveDown(1);
  doc.fontSize(12)
    .fillColor(lightGray)
    .text('Análise baseada na teoria de Carl Jung', { align: 'center' });

  doc.moveDown(2);
  doc.fontSize(16)
    .fillColor(secondaryColor)
    .text(`Tipo: ${result.jung_type?.type || 'N/A'}`);

  doc.moveDown(2);
  const jungScores = result.jung_type || {};
  doc.fontSize(14)
    .fillColor(textColor)
    .text('Dimensões:', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(12)
    .text(`Extroversão: ${jungScores.extroversion || 0}`)
    .text(`Introversão: ${jungScores.introversion || 0}`)
    .text(`Intuição: ${jungScores.intuition || 0}`)
    .text(`Sensação: ${jungScores.sensing || 0}`)
    .text(`Pensamento: ${jungScores.thinking || 0}`)
    .text(`Sentimento: ${jungScores.feeling || 0}`);

  addFooter();

  // ==================== PÁGINA 10: TEORIA DE VALORES ====================
  doc.addPage();
  addHeader();

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text('VALORES MOTIVACIONAIS', 42, 80);

  // Add Values chart if available
  if (chartImages.values) {
    try {
      const response = await fetch(chartImages.values);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      doc.image(buffer, 100, 130, { width: 400 });
    } catch (e) {
      console.error('Error embedding Values chart:', e);
      doc.moveDown(2);
      doc.fontSize(11).fillColor(lightGray).text('[Gráfico de Valores não disponível]', { align: 'center' });
    }
  }

  doc.moveDown(15);
  const values = result.values_scores || {};
  doc.fontSize(14)
    .fillColor(textColor)
    .text('Intensidade dos Valores:', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(12)
    .text(`Social: ${values.social || 0}`)
    .text(`Econômico: ${values.economic || 0}`)
    .text(`Estético: ${values.aesthetic || 0}`)
    .text(`Político: ${values.political || 0}`)
    .text(`Espiritual: ${values.spiritual || 0}`)
    .text(`Teórico: ${values.theoretical || 0}`);

  addFooter();

  // ==================== PÁGINA 11: ESTILO DE LIDERANÇA ====================
  doc.addPage();
  addHeader();

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text('ESTILO DE LIDERANÇA', 42, 80);

  // Add Leadership chart if available
  if (chartImages.leadership) {
    try {
      const response = await fetch(chartImages.leadership);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      doc.image(buffer, 100, 130, { width: 400 });
    } catch (e) {
      console.error('Error embedding Leadership chart:', e);
      doc.moveDown(2);
      doc.fontSize(11).fillColor(lightGray).text('[Gráfico de Liderança não disponível]', { align: 'center' });
    }
  }

  doc.moveDown(15);
  const leadership = result.leadership_style || {};
  doc.fontSize(14)
    .fillColor(textColor)
    .text('Distribuição dos Estilos:', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(12)
    .text(`Executivo: ${leadership.executive || 0}%`)
    .text(`Motivador: ${leadership.motivator || 0}%`)
    .text(`Metódico: ${leadership.methodical || 0}%`)
    .text(`Sistemático: ${leadership.systematic || 0}%`);

  addFooter();

  // ==================== PÁGINA 12: MAPA DE COMPETÊNCIAS ====================
  doc.addPage();
  addHeader();

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text('MAPA DE COMPETÊNCIAS', 42, 80);

  doc.moveDown(1);
  doc.fontSize(12)
    .fillColor(lightGray)
    .text('Avaliação das competências comportamentais', { align: 'center' });

  // Add Competencies chart if available
  if (chartImages.competencies) {
    try {
      const response = await fetch(chartImages.competencies);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      doc.image(buffer, 100, 150, { width: 400 });
    } catch (e) {
      console.error('Error embedding Competencies chart:', e);
      doc.moveDown(2);
      doc.fontSize(11).fillColor(lightGray).text('[Gráfico de Competências não disponível]', { align: 'center' });
    }
  }

  addFooter();

  // ==================== PÁGINA 13: SUGESTÕES PARA COMUNICAÇÃO ====================
  doc.addPage();
  addHeader();

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text('SUGESTÕES PARA COMUNICAÇÃO', 42, 80);

  doc.moveDown(2);
  doc.fontSize(14)
    .fillColor(secondaryColor)
    .text('O QUE FAZER:', { underline: true });

  doc.moveDown(0.5);
  const doList = [
    'Seja claro e direto na comunicação',
    'Apresente dados e informações concretas',
    'Respeite o tempo de reflexão antes das decisões',
    'Mantenha um ambiente organizado e estruturado',
    'Valorize o trabalho bem feito e a atenção aos detalhes'
  ];

  doList.forEach(item => {
    doc.fontSize(11)
      .fillColor(textColor)
      .text(`✓ ${item}`, { lineGap: 3 });
  });

  doc.moveDown(2);
  doc.fontSize(14)
    .fillColor(secondaryColor)
    .text('O QUE EVITAR:', { underline: true });

  doc.moveDown(0.5);
  const dontList = [
    'Evite mudanças bruscas sem aviso prévio',
    'Não pressione por decisões imediatas',
    'Evite ambientes caóticos e desorganizados',
    'Não desconsidere a importância dos processos',
    'Evite críticas públicas ou confrontos diretos'
  ];

  dontList.forEach(item => {
    doc.fontSize(11)
      .fillColor(textColor)
      .text(`✗ ${item}`, { lineGap: 3 });
  });

  addFooter();

  // ==================== PÁGINA FINAL: INSIGHTS PARA VENDAS ====================
  if (result.sales_insights) {
    doc.addPage();
    addHeader();

    doc.fontSize(24)
      .fillColor(primaryColor)
      .text('INSIGHTS PARA VENDAS', 42, 80);

    doc.moveDown(2);
    doc.fontSize(14)
      .fillColor(secondaryColor)
      .text('Pontos Fortes:', { underline: true });

    doc.moveDown(0.5);
    const strengths = result.sales_insights.strengths || [];
    strengths.forEach((strength: string) => {
      doc.fontSize(12)
        .fillColor(textColor)
        .text(`• ${strength}`, { lineGap: 3 });
    });

    doc.moveDown(2);
    doc.fontSize(14)
      .fillColor(secondaryColor)
      .text('Abordagem Recomendada:', { underline: true });

    doc.moveDown(0.5);
    doc.fontSize(12)
      .fillColor(textColor)
      .text(result.sales_insights.approach || 'N/A', { align: 'justify', lineGap: 4 });

    addFooter();
  }

  // Finalize PDF
  doc.end();

  return new Promise<Uint8Array>((resolve) => {
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(new Uint8Array(buffer));
    });
  });
}
