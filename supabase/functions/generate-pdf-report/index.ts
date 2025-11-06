import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsPDF } from "npm:jspdf@2.5.1";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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

    console.log('Chart images generated, creating PDF with jsPDF...');

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
  // Paleta de cores do site convertida para RGB (jsPDF usa RGB)
  const SITE_COLORS = {
    // Cores principais do site
    primary: [210, 188, 143] as [number, number, number],        // Gold #d2bc8f
    background: [12, 18, 28] as [number, number, number],        // Deep navy #0c121c
    card: [26, 35, 50] as [number, number, number],              // Dark blue #1a2332
    foreground: [255, 255, 255] as [number, number, number],     // White
    
    // Cores de status do site
    success: [92, 184, 92] as [number, number, number],          // Green #5cb85c
    warning: [240, 173, 78] as [number, number, number],         // Orange #f0ad4e
    danger: [217, 83, 79] as [number, number, number],           // Red #d9534f
    info: [91, 192, 222] as [number, number, number],            // Blue #5bc0de
    
    // Cores DISC (usando cores de status do site)
    discD: [217, 83, 79] as [number, number, number],            // Red (danger)
    discI: [240, 173, 78] as [number, number, number],           // Orange (warning)
    discS: [92, 184, 92] as [number, number, number],            // Green (success)
    discC: [91, 192, 222] as [number, number, number],           // Blue (info)
    
    // Cores de texto
    textPrimary: [255, 255, 255] as [number, number, number],    // White
    textSecondary: [160, 174, 192] as [number, number, number],  // Gray (muted-foreground)
    textMuted: [107, 114, 128] as [number, number, number],      // Gray claro
    textDark: [17, 24, 39] as [number, number, number],          // Dark gray
    textMedium: [55, 65, 81] as [number, number, number]         // Medium gray
  };

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageHeight = 297;
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  let yPos = margin;
  let currentPage = 1;

  // Helper functions
  const addPage = () => {
    doc.addPage();
    currentPage++;
    addHeader();
    addFooter();
    yPos = margin + 15;
  };

  const addHeader = () => {
    if (currentPage > 1) {
      doc.setFontSize(9);
      doc.setTextColor(...SITE_COLORS.textMuted);
      doc.text('CIS Assessment - Relatório Confidencial', pageWidth - margin, 12, { align: 'right' });
    }
  };

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(...SITE_COLORS.textMuted);
    doc.text(`© 2025 CIS Assessment - Página ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - 30) {
      addPage();
    }
  };

  const wrapText = (text: string, maxWidth: number): string[] => {
    return doc.splitTextToSize(text, maxWidth);
  };

  const addImageFromUrl = async (url: string, x: number, y: number, width: number, height: number) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Validate image size (max 5MB)
      if (uint8Array.byteLength === 0 || uint8Array.byteLength > 5 * 1024 * 1024) {
        throw new Error('Invalid image size');
      }
      
      // Convert to base64
      let base64 = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        base64 += String.fromCharCode.apply(null, Array.from(chunk));
      }
      base64 = btoa(base64);
      const imgData = `data:image/png;base64,${base64}`;
      
      doc.addImage(imgData, 'PNG', x, y, width, height);
      console.log(`✓ Image loaded: ${(uint8Array.byteLength/1024).toFixed(1)}KB`);
    } catch (e) {
      console.error('✗ Image failed:', e);
      // Fallback box
      doc.setFillColor(241, 245, 249);
      doc.rect(x, y, width, height, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(x, y, width, height);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Gráfico indisponível', x + width/2, y + height/2, { align: 'center' });
    }
  };

  const createTable = (data: Array<{label: string, value: string, color?: number[]}>, startY: number, colWidths = [100, 60]) => {
    const rowHeight = 10;
    const [col1Width, col2Width] = colWidths;
    
    data.forEach((row, index) => {
      checkPageBreak(rowHeight + 2);
      
      // Alternating background
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, yPos, col1Width + col2Width, rowHeight, 'F');
      }
      
      // Border
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.rect(margin, yPos, col1Width + col2Width, rowHeight);
      
      // Color indicator if provided
      if (row.color) {
        doc.setFillColor(row.color[0], row.color[1], row.color[2]);
        doc.rect(margin, yPos, 3, rowHeight, 'F');
      }
      
      // Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...SITE_COLORS.textMedium);
      doc.text(row.label, margin + (row.color ? 6 : 3), yPos + 6.5);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...SITE_COLORS.textDark);
      doc.text(row.value, margin + col1Width + 5, yPos + 6.5);
      
      yPos += rowHeight;
    });
    
    return yPos;
  };

  const createColorBox = (title: string, content: string[], color: number[], icon = '') => {
    const boxPadding = 8;
    const lineHeight = 6;
    const estimatedHeight = 15 + (content.length * lineHeight) + boxPadding;
    
    checkPageBreak(estimatedHeight);
    
    const startY = yPos;
    
    // Light background
    doc.setFillColor(color[0], color[1], color[2], 0.05);
    doc.roundedRect(margin, yPos, contentWidth, estimatedHeight, 2, 2, 'F');
    
    // Left border
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, yPos, 4, estimatedHeight, 'F');
    
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(color[0], color[1], color[2]);
    const titleText = icon ? `${icon} ${title}` : title;
    doc.text(titleText, margin + boxPadding, yPos + boxPadding);
    
    // Content
    yPos += boxPadding + 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    
    content.forEach(line => {
      const lines = wrapText(line, contentWidth - (2 * boxPadding));
      lines.forEach((l: string) => {
        doc.text(l, margin + boxPadding, yPos);
        yPos += lineHeight;
      });
    });
    
    yPos = startY + estimatedHeight + 8;
  };

  const addSectionTitle = (title: string, color: [number, number, number] = SITE_COLORS.primary) => {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(title, margin, yPos);
    
    // Decorative line using primary gold color
    doc.setDrawColor(...SITE_COLORS.primary);
    doc.setLineWidth(0.8);
    doc.line(margin, yPos + 3, margin + 70, yPos + 3);
    
    yPos += 15;
  };

  const addSubtitle = (subtitle: string, color: [number, number, number] = SITE_COLORS.textMedium) => {
    checkPageBreak(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(subtitle, margin, yPos);
    yPos += 10;
  };

  const safeGetValue = (obj: any, key: string, defaultValue: any) => {
    return obj && obj[key] !== undefined ? obj[key] : defaultValue;
  };

  // ========== PÁGINA 1: CAPA ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...SITE_COLORS.primary);
  doc.text('MAPEAMENTO DE PERFIL', pageWidth / 2, 80, { align: 'center' });
  doc.text('COMPORTAMENTAL', pageWidth / 2, 100, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text(assessment.candidate_name || 'N/A', pageWidth / 2, 140, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(...SITE_COLORS.textMuted);
  doc.text(`Campanha: ${assessment.campaigns?.name || 'N/A'}`, pageWidth / 2, 160, { align: 'center' });
  doc.text(`Realizado em: ${new Date(assessment.created_at).toLocaleDateString('pt-BR')}`, pageWidth / 2, 175, { align: 'center' });

  // ========== PÁGINA 2: ÍNDICE ==========
  addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...SITE_COLORS.primary);
  doc.text('Conteúdo', margin, yPos);
  yPos += 15;

  const sections = [
    '1. RELATÓRIO COMPORTAMENTAL',
    '2. METODOLOGIA DISC',
    '3. INTENSIDADE DO PERFIL NATURAL',
    '4. INTENSIDADE DO PERFIL ADAPTADO',
    '5. COMO LIDA COM PROBLEMAS E DESAFIOS',
    '6. PONTOS A DESENVOLVER',
    '7. TIPOS PSICOLÓGICOS',
    '8. TEORIA DE VALORES',
    '9. ESTILO DE LIDERANÇA',
    '10. MAPA DE COMPETÊNCIAS',
    '11. SUGESTÕES PARA COMUNICAÇÃO',
    '12. PÁGINA DE GRÁFICOS'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  sections.forEach(section => {
    doc.text(section, margin + 5, yPos);
    yPos += 10;
  });

  // ========== PÁGINA 3: RELATÓRIO COMPORTAMENTAL ==========
  addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...SITE_COLORS.primary);
  doc.text('RELATÓRIO COMPORTAMENTAL', margin, yPos);
  yPos += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  const introParagraphs = [
    'O Relatório CIS Assessment® foi desenvolvido para melhor compreender a personalidade e as potenciais competências dos indivíduos. Entender quais são os pontos fortes e as oportunidades de melhoria para, assim, promover tanto o desenvolvimento pessoal e profissional, como também para melhorar o nível de satisfação interna e externa.',
    'Pesquisas na área do desenvolvimento humano mostram que os indivíduos mais eficazes são aqueles que conhecem melhor a si mesmos.',
    'Em nosso software medimos seis dimensões principais:'
  ];

  introParagraphs.forEach(para => {
    const lines = wrapText(para, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(8);
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    yPos += 3;
  });

  yPos += 3;
  const dimensions = [
    '1. Intensidade de Perfil Comportamental (DISC)',
    '2. Motivadores e adequação profissional',
    '3. Estilo de Liderança',
    '4. Tipo Psicológico (Jung)',
    '5. Mapeamento de competências',
    '6. Inteligências múltiplas'
  ];

  dimensions.forEach(dim => {
    checkPageBreak(8);
    doc.text(dim, margin + 5, yPos);
    yPos += 7;
  });

  // ========== PÁGINA 4: METODOLOGIA DISC ==========
  addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...SITE_COLORS.primary);
  doc.text('METODOLOGIA DISC', margin, yPos);
  yPos += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  const methodologyIntro = 'Em 1928, o Doutor em Psicologia William Moulton Marston desenvolveu um método de compreensão dos padrões de comportamento humano. A metodologia DISC identifica quatro dimensões principais do comportamento:';
  const lines1 = wrapText(methodologyIntro, contentWidth);
  lines1.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 6;
  });

  yPos += 8;
  const discDimensions = [
    { letter: 'D - DOMINÂNCIA', desc: 'Como a pessoa enfrenta problemas e desafios. Pessoas com alto D são assertivas, diretas e focadas em resultados.' },
    { letter: 'I - INFLUÊNCIA', desc: 'Como a pessoa interage e influencia outras pessoas. Pessoas com alto I são comunicativas, entusiastas e persuasivas.' },
    { letter: 'S - ESTABILIDADE', desc: 'Como a pessoa responde a mudanças e ao ritmo. Pessoas com alto S são pacientes, leais e preferem estabilidade.' },
    { letter: 'C - CONFORMIDADE', desc: 'Como a pessoa responde a regras e procedimentos. Pessoas com alto C são analíticas, precisas e seguem padrões.' }
  ];

  discDimensions.forEach(dim => {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...SITE_COLORS.primary);
    doc.text(dim.letter, margin, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const descLines = wrapText(dim.desc, contentWidth);
    descLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    yPos += 5;
  });

  yPos += 5;
  const methodologyConclusion = 'Este relatório apresenta dois perfis: Natural (como você realmente é) e Adaptado (como você se comporta no trabalho). A diferença entre estes perfis indica o nível de tensão comportamental.';
  const lines2 = wrapText(methodologyConclusion, contentWidth);
  lines2.forEach((line: string) => {
    checkPageBreak(8);
    doc.text(line, margin, yPos);
    yPos += 6;
  });

  // Declarar variáveis DISC no início
  const naturalD = safeGetValue(result, 'natural_d', 0);
  const naturalI = safeGetValue(result, 'natural_i', 0);
  const naturalS = safeGetValue(result, 'natural_s', 0);
  const naturalC = safeGetValue(result, 'natural_c', 0);
  const adaptedD = safeGetValue(result, 'adapted_d', 0);
  const adaptedI = safeGetValue(result, 'adapted_i', 0);
  const adaptedS = safeGetValue(result, 'adapted_s', 0);
  const adaptedC = safeGetValue(result, 'adapted_c', 0);

  // ========== NOVA PÁGINA: GRÁFICO DE INTENSIDADE COM DESCRITORES ==========
  addPage();
  addSectionTitle('GRÁFICO DE INTENSIDADE COM DESCRITORES');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  const descriptorIntro = 'Esta tabela mostra os adjetivos que descrevem diferentes níveis de intensidade para cada fator DISC. Os valores destacados indicam o seu perfil natural.';
  const descIntroLines = wrapText(descriptorIntro, contentWidth);
  descIntroLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });
  yPos += 10;

  // Tabela de descritores
  const DISC_DESCRIPTORS = [
    { level: 99, D: "Arrogante", I: "Insinuante", S: "Hesitante", C: "Temeroso" },
    { level: 94, D: "Egocêntrico", I: "Eloquente", S: "Amável", C: "Calculista" },
    { level: 88, D: "Dominador", I: "Inspirador", S: "Previsível", C: "Reservado" },
    { level: 83, D: "Audacioso", I: "Sociável", S: "Leal", C: "Sistemático" },
    { level: 78, D: "Firme", I: "Expressivo", S: "Paciente", C: "Meticuloso" },
    { level: 73, D: "Ativo", I: "Otimista", S: "Sereno", C: "Cuidadoso" },
    { level: 65, D: "Determinado", I: "Positivo", S: "Consistente", C: "Analítico" },
    { level: 60, D: "Objetivo", I: "Amigável", S: "Receptivo", C: "Reflexivo" },
    { level: 54, D: "Assertivo", I: "Cordial", S: "Moderado", C: "Equilibrado" },
    { level: 50, D: "Equilibrado", I: "Equilibrado", S: "Equilibrado", C: "Equilibrado" },
    { level: 46, D: "Cauteloso", I: "Discreto", S: "Adaptável", C: "Flexível" },
    { level: 41, D: "Calculado", I: "Formal", S: "Ágil", C: "Rápido" },
    { level: 35, D: "Hesitante", I: "Contido", S: "Inquieto", C: "Independente" },
    { level: 30, D: "Pacífico", I: "Introspectivo", S: "Impaciente", C: "Autônomo" },
    { level: 21, D: "Passivo", I: "Retraído", S: "Versátil", C: "Abstrato" },
    { level: 15, D: "Submisso", I: "Distante", S: "Inquieto", C: "Conceitual" }
  ];

  // Header da tabela
  const colWidth = (contentWidth - 20) / 5;
  const rowHeight = 7;
  
  doc.setFillColor(...SITE_COLORS.primary);
  doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Nível', margin + 2, yPos + 5);
  doc.text('D', margin + colWidth + 2, yPos + 5);
  doc.text('I', margin + colWidth * 2 + 2, yPos + 5);
  doc.text('S', margin + colWidth * 3 + 2, yPos + 5);
  doc.text('C', margin + colWidth * 4 + 2, yPos + 5);
  yPos += rowHeight;

  // Linhas da tabela
  DISC_DESCRIPTORS.forEach((desc, index) => {
    checkPageBreak(rowHeight + 2);
    
    const isNearD = Math.abs(desc.level - naturalD) < 4;
    const isNearI = Math.abs(desc.level - naturalI) < 4;
    const isNearS = Math.abs(desc.level - naturalS) < 4;
    const isNearC = Math.abs(desc.level - naturalC) < 4;
    
    // Alternating background
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
    }
    
    // Nível
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(desc.level.toString(), margin + 2, yPos + 5);
    
    // D
    doc.setFont('helvetica', 'normal');
    if (isNearD) {
      doc.setFillColor(SITE_COLORS.discD[0], SITE_COLORS.discD[1], SITE_COLORS.discD[2], 0.3);
      doc.rect(margin + colWidth, yPos, colWidth, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...SITE_COLORS.discD);
    } else {
      doc.setTextColor(55, 65, 81);
    }
    doc.text(desc.D, margin + colWidth + 2, yPos + 5);
    
    // I
    doc.setFont('helvetica', 'normal');
    if (isNearI) {
      doc.setFillColor(SITE_COLORS.discI[0], SITE_COLORS.discI[1], SITE_COLORS.discI[2], 0.3);
      doc.rect(margin + colWidth * 2, yPos, colWidth, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...SITE_COLORS.discI);
    } else {
      doc.setTextColor(55, 65, 81);
    }
    doc.text(desc.I, margin + colWidth * 2 + 2, yPos + 5);
    
    // S
    doc.setFont('helvetica', 'normal');
    if (isNearS) {
      doc.setFillColor(SITE_COLORS.discS[0], SITE_COLORS.discS[1], SITE_COLORS.discS[2], 0.3);
      doc.rect(margin + colWidth * 3, yPos, colWidth, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...SITE_COLORS.discS);
    } else {
      doc.setTextColor(55, 65, 81);
    }
    doc.text(desc.S, margin + colWidth * 3 + 2, yPos + 5);
    
    // C
    doc.setFont('helvetica', 'normal');
    if (isNearC) {
      doc.setFillColor(SITE_COLORS.discC[0], SITE_COLORS.discC[1], SITE_COLORS.discC[2], 0.3);
      doc.rect(margin + colWidth * 4, yPos, colWidth, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...SITE_COLORS.discC);
    } else {
      doc.setTextColor(55, 65, 81);
    }
    doc.text(desc.C, margin + colWidth * 4 + 2, yPos + 5);
    
    // Border
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.1);
    doc.rect(margin, yPos, contentWidth, rowHeight);
    
    yPos += rowHeight;
  });

  // ========== 4 PÁGINAS DE ANÁLISE INDIVIDUAL DE FATORES ==========
  const factorsToAnalyze: Array<{ key: 'D' | 'I' | 'S' | 'C', title: string, color: [number, number, number] }> = [
    { key: 'D', title: 'COMO LIDA COM PROBLEMAS E DESAFIOS', color: SITE_COLORS.discD },
    { key: 'I', title: 'COMO LIDA COM AS PESSOAS', color: SITE_COLORS.discI },
    { key: 'S', title: 'COMO RESPONDE AO RITMO E MUDANÇAS', color: SITE_COLORS.discS },
    { key: 'C', title: 'COMO RESPONDE A REGRAS E PROCEDIMENTOS', color: SITE_COLORS.discC }
  ];

  const factorValues = {
    D: { natural: naturalD, adapted: adaptedD },
    I: { natural: naturalI, adapted: adaptedI },
    S: { natural: naturalS, adapted: adaptedS },
    C: { natural: naturalC, adapted: adaptedC }
  };

  factorsToAnalyze.forEach(factor => {
    addPage();
    addSectionTitle(factor.title, factor.color);
    
    const natural = factorValues[factor.key].natural;
    const adapted = factorValues[factor.key].adapted;
    
    // Gráfico de barras horizontais
    const barHeight = 12;
    const maxBarWidth = contentWidth - 55;
    const labelWidth = 50;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(factor.color[0], factor.color[1], factor.color[2]);
    doc.text('Intensidade:', margin, yPos);
    yPos += 8;
    
    // Barra Natural
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text('Natural:', margin, yPos + 8);
    
    doc.setFillColor(...factor.color);
    const naturalWidth = (natural / 100) * maxBarWidth;
    doc.rect(margin + labelWidth, yPos, naturalWidth, barHeight, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin + labelWidth, yPos, maxBarWidth, barHeight);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    if (naturalWidth > 15) {
      doc.text(natural.toString(), margin + labelWidth + naturalWidth - 12, yPos + 8);
    } else {
      doc.setTextColor(0, 0, 0);
      doc.text(natural.toString(), margin + labelWidth + naturalWidth + 3, yPos + 8);
    }
    
    yPos += barHeight + 8;
    
    // Barra Adaptado
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text('Adaptado:', margin, yPos + 8);
    
    doc.setFillColor(75, 85, 99);
    const adaptedWidth = (adapted / 100) * maxBarWidth;
    doc.rect(margin + labelWidth, yPos, adaptedWidth, barHeight, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin + labelWidth, yPos, maxBarWidth, barHeight);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    if (adaptedWidth > 15) {
      doc.text(adapted.toString(), margin + labelWidth + adaptedWidth - 12, yPos + 8);
    } else {
      doc.setTextColor(0, 0, 0);
      doc.text(adapted.toString(), margin + labelWidth + adaptedWidth + 3, yPos + 8);
    }
    
    yPos += barHeight + 15;
    
    // Análise textual
    const diff = adapted - natural;
    const direction = diff > 5 ? 'crescente' : diff < -5 ? 'decrescente' : 'equilibrado';
    
    // Traço Natural
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(factor.color[0], factor.color[1], factor.color[2]);
    doc.text('TRAÇO NATURAL:', margin, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const naturalDescription = getFactorNaturalDescription(factor.key, natural);
    const natLines = wrapText(naturalDescription, contentWidth);
    natLines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 8;
    
    // Adaptação
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(factor.color[0], factor.color[1], factor.color[2]);
    doc.text(`ADAPTAÇÃO ${direction.toUpperCase()}:`, margin, yPos);
    yPos += 7;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const adaptedDescription = getFactorAdaptedDescription(factor.key, direction);
    const adaptLines = wrapText(adaptedDescription, contentWidth);
    adaptLines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 8;
    
    // Análise da diferença
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(factor.color[0], factor.color[1], factor.color[2]);
    doc.text('ANÁLISE:', margin, yPos);
    yPos += 7;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const analysisText = getFactorAnalysisText(factor.key, natural, adapted);
    const analysisLines = wrapText(analysisText, contentWidth);
    analysisLines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin, yPos);
      yPos += 5;
    });
  });

  // ========== PÁGINA 5: PERFIL NATURAL ==========
  addPage();
  addSectionTitle('INTENSIDADE DO PERFIL NATURAL');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text('(Como você realmente é)', margin, yPos);
  yPos += 15;

  // Scores Table (variáveis já declaradas acima)

  const naturalScoresData = [
    { label: 'D (Dominância)', value: `${naturalD}/100`, color: SITE_COLORS.discD },
    { label: 'I (Influência)', value: `${naturalI}/100`, color: SITE_COLORS.discI },
    { label: 'S (Estabilidade)', value: `${naturalS}/100`, color: SITE_COLORS.discS },
    { label: 'C (Conformidade)', value: `${naturalC}/100`, color: SITE_COLORS.discC }
  ];

  createTable(naturalScoresData, yPos);
  yPos += 5;
  if (result.primary_profile) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...SITE_COLORS.primary);
    doc.text(`Perfil Primário: ${result.primary_profile}`, margin, yPos);
    yPos += 10;

    if (result.secondary_profile) {
      doc.setFontSize(12);
      doc.text(`Perfil Secundário: ${result.secondary_profile}`, margin, yPos);
      yPos += 10;
    }
  }

  // Add DISC chart
  if (chartImages.disc) {
    checkPageBreak(75);
    await addImageFromUrl(chartImages.disc, margin, yPos, contentWidth, 70);
    yPos += 75;
  }

  // Profile description
  if (result.primary_profile) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    const profileDesc = getProfileDescription(result.primary_profile);
    const descLines = wrapText(profileDesc, contentWidth);
    descLines.forEach((line: string) => {
      checkPageBreak(8);
      doc.text(line, margin, yPos);
      yPos += 6;
    });
  }

  // ========== PÁGINA 6: PERFIL ADAPTADO ==========
  addPage();
  addSectionTitle('INTENSIDADE DO PERFIL ADAPTADO');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text('(Como você se comporta no trabalho)', margin, yPos);
  yPos += 15;

  // Adapted scores Table (variáveis já declaradas acima)

  const adaptedScoresData = [
    { label: 'D (Dominância)', value: `${adaptedD}/100`, color: SITE_COLORS.discD },
    { label: 'I (Influência)', value: `${adaptedI}/100`, color: SITE_COLORS.discI },
    { label: 'S (Estabilidade)', value: `${adaptedS}/100`, color: SITE_COLORS.discS },
    { label: 'C (Conformidade)', value: `${adaptedC}/100`, color: SITE_COLORS.discC }
  ];

  createTable(adaptedScoresData, yPos);
  yPos += 10;

  // Tension Level Box
  if (result.tension_level) {
    const tensionMap: Record<string, string> = {
      'low': 'Baixo',
      'medium': 'Médio',
      'high': 'Alto'
    };
    const tensionText = tensionMap[result.tension_level] || 'Não calculado';
    const tensionColors: Record<string, [number, number, number]> = {
      'low': SITE_COLORS.success,
      'medium': SITE_COLORS.warning,
      'high': SITE_COLORS.danger
    };
    const tensionColor = tensionColors[result.tension_level] || [107, 114, 128];
    
    const tensionExplanations: Record<string, string> = {
      'low': 'Você está confortável sendo quem realmente é no ambiente de trabalho. Há pouca diferença entre seu comportamento natural e adaptado.',
      'medium': 'Você está fazendo alguns ajustes no seu comportamento natural para se adaptar ao ambiente de trabalho. Um nível moderado de adaptação é normal.',
      'high': 'Você está fazendo ajustes significativos no seu comportamento, o que pode gerar estresse e cansaço ao longo do tempo. Considere avaliar se o ambiente está alinhado com suas características naturais.'
    };
    
    createColorBox(
      `Nível de Tensão: ${tensionText}`,
      [tensionExplanations[result.tension_level] || 'Nível de tensão não calculado.'],
      tensionColor,
      result.tension_level === 'high' ? '⚠️' : result.tension_level === 'medium' ? '⚡' : '✓'
    );
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    const tensionExplain = result.tension_level === 'low' 
      ? 'Você está confortável sendo quem realmente é no ambiente de trabalho.'
      : result.tension_level === 'medium'
      ? 'Você está fazendo alguns ajustes no seu comportamento natural.'
      : 'Você está fazendo ajustes significativos, o que pode gerar estresse.';
    const tensionLines = wrapText(tensionExplain, contentWidth);
    tensionLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
  }

  // ========== PÁGINA 7: COMO LIDA COM PROBLEMAS ==========
  addPage();
  addSectionTitle('COMO LIDA COM PROBLEMAS E DESAFIOS');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  const problemSolving = getProfileProblemSolving(result.primary_profile);
  if (problemSolving.length > 0) {
    problemSolving.forEach((point: string) => {
      checkPageBreak(15);
      doc.text('•', margin + 2, yPos);
      const pointLines = wrapText(point, contentWidth - 10);
      pointLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 8, yPos);
        if (idx < pointLines.length - 1) yPos += 6;
      });
      yPos += 10;
    });
  }

  // ========== PÁGINA 8: PONTOS A DESENVOLVER ==========
  addPage();
  addSectionTitle('PONTOS A DESENVOLVER', SITE_COLORS.warning);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  const developmentPoints = getProfileDevelopmentPoints(result.primary_profile);
  if (developmentPoints.length > 0) {
    developmentPoints.forEach((point: string) => {
      checkPageBreak(15);
      doc.text('•', margin + 2, yPos);
      const pointLines = wrapText(point, contentWidth - 10);
      pointLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 8, yPos);
        if (idx < pointLines.length - 1) yPos += 6;
      });
      yPos += 10;
    });
  }

  // ========== PÁGINA 9: TIPOS PSICOLÓGICOS ==========
  if (result.jung_type) {
    addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...SITE_COLORS.primary);
    doc.text('TIPOS PSICOLÓGICOS', margin, yPos);
    yPos += 12;

    const jungType = result.jung_type.type || 'N/A';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...SITE_COLORS.primary);
    doc.text(`Tipo: ${jungType}`, margin, yPos);
    yPos += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const jungScores = [
      { dim: 'Extroversão:', value: result.jung_type.extroversion || 0 },
      { dim: 'Introversão:', value: result.jung_type.introversion || 0 },
      { dim: 'Intuição:', value: result.jung_type.intuition || 0 },
      { dim: 'Sensação:', value: result.jung_type.sensing || 0 },
      { dim: 'Pensamento:', value: result.jung_type.thinking || 0 },
      { dim: 'Sentimento:', value: result.jung_type.feeling || 0 }
    ];

    jungScores.forEach(score => {
      doc.setFont('helvetica', 'bold');
      doc.text(score.dim, margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${score.value}`, margin + 50, yPos);
      yPos += 8;
    });

    yPos += 8;
    const jungDesc = getJungianDescription(jungType);
    if (jungDesc) {
      const jungLines = wrapText(jungDesc, contentWidth);
      jungLines.forEach((line: string) => {
        checkPageBreak(8);
        doc.text(line, margin, yPos);
        yPos += 6;
      });
    }
  }

  // ========== PÁGINA 10: TEORIA DE VALORES ==========
  if (result.values_scores) {
    addPage();
    addSectionTitle('TEORIA DE VALORES', [139, 92, 246]);

    const valueNames: Record<string, string> = {
      social: 'Social - Ajudar e servir outros',
      economic: 'Econômico - Retorno prático e financeiro',
      aesthetic: 'Estético - Equilíbrio e harmonia',
      political: 'Político - Poder e influência',
      spiritual: 'Espiritual - Unidade e propósito maior',
      theoretical: 'Teórico - Conhecimento e verdade'
    };

    const valuesData = Object.entries(result.values_scores).map(([key, value]) => ({
      label: valueNames[key] || key,
      value: `${value}/60`
    }));

    createTable(valuesData, yPos, [120, 40]);
    yPos += 15;

    if (chartImages.values) {
      checkPageBreak(80);
      await addImageFromUrl(chartImages.values, margin, yPos, contentWidth, 75);
      yPos += 80;
    }
  }

  // ========== PÁGINA 11: ESTILO DE LIDERANÇA ==========
  if (result.leadership_style) {
    addPage();
    addSectionTitle('ESTILO DE LIDERANÇA', SITE_COLORS.success);

    const leadershipNames: Record<string, string> = {
      executive: 'Executivo - Focado em resultados',
      motivator: 'Motivador - Inspirador e energético',
      methodical: 'Metódico - Analítico e preciso',
      systematic: 'Sistemático - Organizado e estável'
    };

    const leadershipData = Object.entries(result.leadership_style).map(([key, value]) => ({
      label: leadershipNames[key] || key,
      value: `${value}%`
    }));

    createTable(leadershipData, yPos, [120, 40]);
    yPos += 15;

    if (chartImages.leadership) {
      checkPageBreak(80);
      await addImageFromUrl(chartImages.leadership, margin, yPos, contentWidth, 75);
      yPos += 80;
    }
  }

  // ========== PÁGINA 12: MAPA DE COMPETÊNCIAS ==========
  if (result.competencies && chartImages.competencies) {
    addPage();
    addSectionTitle('MAPA DE COMPETÊNCIAS', [236, 72, 153]);

    await addImageFromUrl(chartImages.competencies, margin, yPos, contentWidth, 110);
    yPos += 115;
  }

  // ========== PÁGINA 13: SUGESTÕES DE COMUNICAÇÃO ==========
  addPage();
  addSectionTitle('SUGESTÕES PARA COMUNICAÇÃO', [99, 102, 241]);

  const commTips = getProfileCommunicationTips(result.primary_profile);
  if (commTips) {
    if (commTips.do && commTips.do.length > 0) {
      createColorBox('✓ O que fazer', commTips.do, SITE_COLORS.success);
      yPos += 5;
    }

    if (commTips.dont && commTips.dont.length > 0) {
      createColorBox('✗ O que evitar', commTips.dont, SITE_COLORS.danger);
    }
  }

  // ========== PÁGINA: GRÁFICOS CONSOLIDADOS ==========
  if (chartImages.disc || chartImages.values || chartImages.leadership || chartImages.competencies) {
    addPage();
    addSectionTitle('VISÃO GERAL - TODOS OS GRÁFICOS', [107, 114, 128]);
    
    const chartWidth = (contentWidth - 15) / 2;
    const chartHeight = 70;
    let currentChartY = yPos;

    // Row 1: DISC and Values
    if (chartImages.disc) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...SITE_COLORS.danger);
      doc.text('Perfil DISC', margin, currentChartY);
      currentChartY += 6;
      
      await addImageFromUrl(chartImages.disc, margin, currentChartY, chartWidth, chartHeight);
    }

    let rightChartY = yPos;
    if (chartImages.values) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(139, 92, 246);
      doc.text('Valores Motivacionais', margin + chartWidth + 15, rightChartY);
      rightChartY += 6;
      
      await addImageFromUrl(chartImages.values, margin + chartWidth + 15, rightChartY, chartWidth, chartHeight);
    }

    // Row 2: Leadership and Competencies
    currentChartY += chartHeight + 18;
    checkPageBreak(chartHeight + 25);
    
    if (chartImages.leadership) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...SITE_COLORS.success);
      doc.text('Estilo de Liderança', margin, currentChartY);
      currentChartY += 6;
      
      await addImageFromUrl(chartImages.leadership, margin, currentChartY, chartWidth, chartHeight);
    }

    rightChartY += chartHeight + 18;
    if (chartImages.competencies) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(236, 72, 153);
      doc.text('Mapa de Competências', margin + chartWidth + 15, rightChartY);
      rightChartY += 6;
      
      await addImageFromUrl(chartImages.competencies, margin + chartWidth + 15, rightChartY, chartWidth, chartHeight);
    }

    yPos = Math.max(currentChartY, rightChartY) + chartHeight + 15;
  }

  // ========== PÁGINA 15: PLANO DE AÇÃO ==========
  addPage();
  addSectionTitle('PLANO DE AÇÃO PERSONALIZADO', SITE_COLORS.success);

  const actionPlan = getActionPlan(result.primary_profile, result.tension_level);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  const introText = 'Com base no seu perfil e nível de tensão, recomendamos as seguintes ações para seu desenvolvimento:';
  const introLines = wrapText(introText, contentWidth);
  introLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 10;

  actionPlan.forEach((action, index) => {
    checkPageBreak(25);
    
    // Number circle
    doc.setFillColor(...SITE_COLORS.primary);
    doc.circle(margin + 4, yPos - 2, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${index + 1}`, margin + 4, yPos + 1, { align: 'center' });
    
    // Action text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    const actionLines = wrapText(action, contentWidth - 15);
    actionLines.forEach((line: string, idx: number) => {
      doc.text(line, margin + 12, yPos);
      if (idx < actionLines.length - 1) yPos += 6;
    });
    yPos += 12;
  });

  // Finalize and return PDF
  const pdfArrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(pdfArrayBuffer);
}

// Helper functions
function getProfileDescription(profileName: string | null): string {
  const profiles: Record<string, string> = {
    'Executor': 'O perfil Executor combina alta dominância com foco em realização. São profissionais que transformam visão em ação, superando obstáculos com determinação. Demonstram forte capacidade de liderança, tomada de decisão rápida e foco intenso em resultados tangíveis.',
    'Comunicador': 'O perfil Comunicador combina alta influência com energia social. São profissionais que inspiram e motivam através de sua comunicação carismática e entusiasmo contagiante. Destacam-se em construir relacionamentos, trabalhar em equipe e criar ambientes positivos.',
    'Planejador': 'O perfil Planejador combina alta estabilidade com forte senso de lealdade e compromisso. São profissionais que trazem consistência, confiabilidade e harmonia para equipes. Destacam-se em manter processos funcionando suavemente e apoiar colegas.',
    'Analista': 'O perfil Analista combina alta conformidade com foco intenso em qualidade e precisão. São profissionais que garantem excelência através de análise cuidadosa e atenção meticulosa aos detalhes.'
  };
  return profiles[profileName || ''] || 'Perfil comportamental com características únicas.';
}

function getProfileProblemSolving(profileName: string | null): string[] {
  const problemSolving: Record<string, string[]> = {
    'Executor': [
      'Age rapidamente diante de desafios, buscando soluções práticas',
      'Assume controle das situações problemáticas com confiança',
      'Foca em resolver ao invés de analisar excessivamente',
      'Pode subestimar complexidade em favor de velocidade',
      'Prefere ação direta a longas discussões sobre o problema'
    ],
    'Comunicador': [
      'Busca soluções colaborativas envolvendo a equipe',
      'Mantém otimismo mesmo em situações desafiadoras',
      'Usa criatividade para encontrar alternativas inovadoras',
      'Pode subestimar gravidade por excesso de otimismo',
      'Prefere resolver através de diálogo e persuasão'
    ],
    'Planejador': [
      'Analisa calmamente antes de agir',
      'Busca soluções que mantenham harmonia do grupo',
      'Consulta outros antes de fazer mudanças',
      'Considera impacto de longo prazo das decisões',
      'Prefere abordagens testadas a experimentações arriscadas',
      'Pode demorar em decisões que exigem mudança rápida'
    ],
    'Analista': [
      'Analisa sistematicamente todas as variáveis',
      'Busca a solução mais correta e precisa',
      'Segue procedimentos estabelecidos e testados',
      'Considera todas as consequências possíveis',
      'Pode demorar buscando informação perfeita',
      'Prefere dados concretos a intuição'
    ]
  };
  return problemSolving[profileName || ''] || [];
}

function getProfileDevelopmentPoints(profileName: string | null): string[] {
  const development: Record<string, string[]> = {
    'Executor': [
      'Desenvolver paciência com processos e pessoas mais lentas',
      'Melhorar escuta ativa antes de tomar decisões',
      'Considerar impacto emocional das decisões na equipe',
      'Dar mais atenção a detalhes importantes',
      'Equilibrar velocidade com qualidade',
      'Praticar empatia e considerar perspectivas diferentes',
      'Aprender a delegar efetivamente'
    ],
    'Comunicador': [
      'Melhorar organização e gestão de tempo',
      'Focar mais em detalhes e precisão',
      'Cumprir prazos de forma mais consistente',
      'Ser mais objetivo em decisões de negócio',
      'Desenvolver capacidade de trabalho independente',
      'Ouvir mais ativamente e falar menos',
      'Dar mais atenção a tarefas administrativas'
    ],
    'Planejador': [
      'Ser mais assertivo ao expressar opiniões',
      'Adaptar-se mais rapidamente a mudanças',
      'Tomar decisões com mais velocidade quando necessário',
      'Lidar melhor com conflitos ao invés de evitá-los',
      'Sair da zona de conforto com mais frequência',
      'Aprender a dizer não quando apropriado',
      'Desenvolver senso de urgência em situações críticas'
    ],
    'Analista': [
      'Ser menos perfeccionista, aceitar bom o suficiente',
      'Tomar decisões mais rápidas com informação suficiente',
      'Aceitar que erros fazem parte do aprendizado',
      'Ser mais flexível com mudanças imprevistas',
      'Melhorar habilidades sociais e expressão emocional',
      'Confiar mais na intuição além de dados',
      'Desenvolver tolerância à ambiguidade'
    ]
  };
  return development[profileName || ''] || [];
}

function getProfileCommunicationTips(profileName: string | null): { do: string[], dont: string[] } | null {
  const tips: Record<string, { do: string[], dont: string[] }> = {
    'Executor': {
      do: [
        'Seja direto e objetivo na comunicação',
        'Apresente soluções e opções claras',
        'Foque em resultados e benefícios tangíveis',
        'Respeite o tempo e vá direto ao ponto',
        'Use dados concretos para suportar argumentos',
        'Reconheça conquistas e resultados alcançados'
      ],
      dont: [
        'Evite rodeios ou excesso de detalhes',
        'Não tome decisões por ele sem consultar',
        'Evite conversas muito longas sem propósito',
        'Não seja excessivamente emocional',
        'Evite questionar sua competência publicamente',
        'Não imponha processos sem justificativa clara'
      ]
    },
    'Comunicador': {
      do: [
        'Seja amigável e entusiasta',
        'Demonstre interesse genuíno na pessoa',
        'Permita interação e troca de ideias',
        'Reconheça contribuições publicamente',
        'Use histórias e exemplos práticos',
        'Mantenha tom positivo e energético'
      ],
      dont: [
        'Evite ser excessivamente formal ou frio',
        'Não seja muito crítico ou negativo',
        'Evite ignorar suas ideias ou contribuições',
        'Não force trabalho isolado por longos períodos',
        'Evite reuniões longas sem interação',
        'Não seja impessoal na comunicação'
      ]
    },
    'Planejador': {
      do: [
        'Seja paciente e cordial',
        'Mantenha tom amigável e respeitoso',
        'Dê tempo para processar informações',
        'Mostre apoio e crie ambiente seguro',
        'Explique mudanças com antecedência',
        'Reconheça lealdade e trabalho consistente'
      ],
      dont: [
        'Evite pressão por decisões imediatas',
        'Não imponha mudanças abruptas',
        'Evite criar conflitos desnecessários',
        'Não ignore suas preocupações',
        'Evite ambiente de alta pressão constante',
        'Não desvalorize a importância da estabilidade'
      ]
    },
    'Analista': {
      do: [
        'Seja lógico e preciso',
        'Apresente dados e evidências concretas',
        'Dê tempo adequado para análise',
        'Respeite necessidade de qualidade',
        'Seja organizado na apresentação',
        'Forneça documentação detalhada'
      ],
      dont: [
        'Evite pressão por decisões rápidas',
        'Não apresente informações incompletas',
        'Evite ser excessivamente emocional',
        'Não critique trabalho sem fundamento',
        'Evite mudanças sem justificativa clara',
        'Não desrespeite a importância da precisão'
      ]
    }
  };
  return tips[profileName || ''] || null;
}

function getJungianDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'ISFJ': 'O Protetor - Pessoas com este tipo são calorosas, responsáveis e conscienciosas. Valorizam tradições e estabilidade, sendo extremamente dedicadas às pessoas que amam. São práticas e meticulosas, focando em detalhes e em manter harmonia.',
    'ISTJ': 'O Inspetor - Indivíduos responsáveis, leais e trabalhadores. Valorizam lógica e praticidade, seguindo procedimentos estabelecidos. São organizados e confiáveis.',
    'ESFJ': 'O Provedor - Pessoas prestativas, leais e organizadas. Focam em ajudar outros e manter harmonia social.',
    'ESTJ': 'O Executivo - Organizados, práticos e decisivos. Focam em resultados e eficiência.'
  };
  return descriptions[type] || `Tipo ${type} - Combinação única de características de personalidade.`;
}

function getActionPlan(profileName: string | null, tensionLevel: string): string[] {
  const plans: Record<string, Record<string, string[]>> = {
    'Executor': {
      'low': [
        'Continue aproveitando sua capacidade natural de liderança e tomada de decisão rápida',
        'Desenvolva ainda mais suas habilidades de comunicação para inspirar equipes',
        'Pratique delegar tarefas para desenvolver sua equipe',
        'Reserve tempo para ouvir feedback antes de agir',
        'Participe de projetos que desafiem sua zona de conforto'
      ],
      'medium': [
        'Identifique situações onde está se adaptando demais e avalie se é necessário',
        'Pratique técnicas de relaxamento para gerenciar estresse',
        'Comunique suas necessidades com assertividade',
        'Reserve tempo para atividades que permitam expressar sua natureza dominante',
        'Busque mentoria para equilibrar adaptação e autenticidade'
      ],
      'high': [
        'URGENTE: Avalie se o ambiente atual está alinhado com suas características',
        'Pratique técnicas diárias de gerenciamento de estresse',
        'Considere conversar com liderança sobre ajustes no papel',
        'Reserve tempo diário para atividades que permitam ser você mesmo',
        'Busque apoio profissional (coach/terapeuta) para gerenciar tensão',
        'Explore oportunidades que permitam maior alinhamento com seu perfil natural'
      ]
    },
    'Comunicador': {
      'low': [
        'Continue usando sua energia social para motivar equipes',
        'Desenvolva habilidades de organização e gestão de tempo',
        'Pratique foco em uma tarefa por vez',
        'Reserve tempo para planejamento antes de agir',
        'Desenvolva habilidades técnicas complementares'
      ],
      'medium': [
        'Identifique ambientes onde pode expressar mais sua sociabilidade',
        'Pratique técnicas de foco para tarefas individuais',
        'Comunique sua necessidade de interação social',
        'Reserve tempo para networking e conexões',
        'Busque equilibrar trabalho individual com colaborativo'
      ],
      'high': [
        'URGENTE: Busque mais oportunidades de interação social no trabalho',
        'Evite isolamento prolongado - programe pausas sociais',
        'Converse com gestão sobre projetos mais colaborativos',
        'Pratique auto-cuidado e atividades energizantes',
        'Considere ambientes de trabalho mais alinhados com seu perfil',
        'Busque apoio para gerenciar estresse de adaptação'
      ]
    },
    'Planejador': {
      'low': [
        'Continue sendo o pilar de estabilidade da equipe',
        'Pratique adaptação gradual a pequenas mudanças',
        'Desenvolva habilidades de tomada de decisão mais rápida',
        'Aprenda a dizer não quando necessário',
        'Participe de projetos que o tirem da zona de conforto'
      ],
      'medium': [
        'Identifique fontes de pressão e mudança excessiva',
        'Comunique sua necessidade de tempo para processar mudanças',
        'Pratique técnicas de adaptação a mudanças',
        'Reserve tempo para rotinas que trazem conforto',
        'Busque ambientes mais estáveis quando possível'
      ],
      'high': [
        'URGENTE: Ambiente pode estar muito volátil para seu perfil',
        'Pratique técnicas de gerenciamento de ansiedade',
        'Converse com gestão sobre ritmo de mudanças',
        'Crie rotinas pessoais para manter estabilidade',
        'Considere ambientes com mais previsibilidade',
        'Busque apoio profissional para gerenciar estresse'
      ]
    },
    'Analista': {
      'low': [
        'Continue sendo referência em qualidade e precisão',
        'Pratique aceitar "bom o suficiente" em situações apropriadas',
        'Desenvolva habilidades de decisão com informação incompleta',
        'Melhore comunicação de insights técnicos para não-técnicos',
        'Participe de situações que exijam flexibilidade'
      ],
      'medium': [
        'Identifique situações onde precisão é menos crítica',
        'Pratique tomada de decisão mais rápida',
        'Comunique necessidade de tempo para análise quando crítico',
        'Reserve tempo para trabalho detalhado',
        'Busque equilibrar qualidade com eficiência'
      ],
      'high': [
        'URGENTE: Ambiente pode estar exigindo velocidade demais',
        'Pratique aceitar imperfeição em situações não-críticas',
        'Converse com gestão sobre expectativas de qualidade vs velocidade',
        'Reserve tempo para trabalho profundo e focado',
        'Considere ambientes que valorizem mais qualidade',
        'Busque apoio para gerenciar perfeccionismo excessivo'
      ]
    }
  };

  const profilePlan = plans[profileName || ''];
  if (!profilePlan) {
    return [
      'Identifique seus pontos fortes e como usá-los mais',
      'Desenvolva áreas de melhoria gradualmente',
      'Busque feedback regular de colegas e gestores',
      'Invista em aprendizado contínuo',
      'Mantenha equilíbrio entre vida pessoal e profissional'
    ];
  }

  return profilePlan[tensionLevel] || profilePlan['medium'];
}

// Funções auxiliares para análise de fatores individuais
function getFactorNaturalDescription(factor: 'D' | 'I' | 'S' | 'C', value: number): string {
  const descriptions = {
    D: {
      high: 'Você naturalmente assume controle de situações, busca desafios e toma decisões rapidamente. Prefere estar em posição de liderança e não tem medo de enfrentar problemas de frente. Sua assertividade é uma característica central do seu perfil.',
      medium: 'Você demonstra assertividade quando necessário, mas não precisa estar sempre no controle. Consegue equilibrar liderança com colaboração, adaptando seu estilo conforme a situação exige.',
      low: 'Você prefere abordagens mais diplomáticas e menos diretas ao lidar com problemas. Tende a evitar confrontos e valoriza consenso. Sua força está em mediar e facilitar, não em impor decisões.'
    },
    I: {
      high: 'Você é naturalmente sociável, expressivo e se energiza através de interações com pessoas. Comunicação é sua forte característica, e você tem facilidade para influenciar e inspirar outros. Ambientes sociais são onde você prospera.',
      medium: 'Você consegue ser sociável quando necessário, mas também valoriza momentos de trabalho mais focado. Sua comunicação é eficaz sem ser excessivamente expansiva.',
      low: 'Você prefere interações mais limitadas e profundas a networking amplo. Tende a ser mais reservado e reflexivo. Sua força está em comunicação escrita ou em grupos pequenos.'
    },
    S: {
      high: 'Você valoriza estabilidade, consistência e ambientes previsíveis. É paciente, leal e prefere processos estabelecidos. Mudanças abruptas podem ser desconfortáveis. Sua confiabilidade é um ativo importante.',
      medium: 'Você aprecia estabilidade mas consegue adaptar-se a mudanças quando necessário. Equilibra necessidade de previsibilidade com flexibilidade razoável.',
      low: 'Você é naturalmente adaptável e confortável com mudanças. Prefere variedade a rotina e pode se sentir entediado em ambientes muito estáveis. Sua versatilidade é uma força.'
    },
    C: {
      high: 'Você valoriza precisão, qualidade e processos sistemáticos. Atenção a detalhes é natural para você, e você tem padrões elevados. Prefere tempo adequado para análise e documentação completa.',
      medium: 'Você presta atenção a detalhes importantes mas não se perde em minúcias desnecessárias. Consegue equilibrar qualidade com pragmatismo.',
      low: 'Você prefere visão geral a detalhes minuciosos. Trabalha de forma mais intuitiva e flexível, não se prendendo excessivamente a processos.'
    }
  };
  
  const level = value > 60 ? 'high' : value > 40 ? 'medium' : 'low';
  return descriptions[factor][level];
}

function getFactorAdaptedDescription(factor: 'D' | 'I' | 'S' | 'C', direction: string): string {
  const descriptions = {
    D: {
      crescente: 'Você está se adaptando para ser mais assertivo e direto do que sua natureza. Isso pode indicar que seu ambiente atual exige mais liderança e tomada rápida de decisões.',
      decrescente: 'Você está moderando sua assertividade natural. Isso pode ocorrer em ambientes onde a colaboração e a diplomacia são mais valorizadas.',
      equilibrado: 'Seu nível de assertividade adaptado está alinhado com sua natureza. Você está atuando de forma autêntica.'
    },
    I: {
      crescente: 'Você está se esforçando para ser mais comunicativo do que naturalmente se sente. Isso pode indicar que seu ambiente valoriza networking e apresentações.',
      decrescente: 'Você está contendo sua extroversão natural. Isso pode ocorrer em ambientes mais formais ou técnicos.',
      equilibrado: 'Seu nível de sociabilidade adaptado está alinhado com sua natureza. Você pode se expressar autenticamente.'
    },
    S: {
      crescente: 'Você está desenvolvendo mais paciência e estabilidade do que sua natureza sugere. Isso pode indicar um ambiente que requer mais consistência.',
      decrescente: 'Você está sendo mais flexível do que sua preferência natural. Isso pode ocorrer em ambientes de mudanças frequentes.',
      equilibrado: 'Seu ritmo de trabalho adaptado está alinhado com suas preferências naturais.'
    },
    C: {
      crescente: 'Você está aumentando seu foco em detalhes além de sua inclinação natural. Isso pode indicar que seu papel exige maior rigor técnico.',
      decrescente: 'Você está sendo mais flexível com processos do que sua natureza prefere. Isso pode ocorrer em ambientes mais dinâmicos.',
      equilibrado: 'Seu nível de atenção a detalhes está alinhado com sua natureza.'
    }
  };
  
  return descriptions[factor][direction as 'crescente' | 'decrescente' | 'equilibrado'];
}

function getFactorAnalysisText(factor: 'D' | 'I' | 'S' | 'C', natural: number, adapted: number): string {
  const diff = adapted - natural;
  const absDiff = Math.abs(diff);
  
  if (absDiff < 5) {
    return 'Há alinhamento entre seu perfil natural e adaptado neste fator. Você pode atuar de forma autêntica sem necessidade de ajustes significativos, o que contribui para seu bem-estar e eficácia profissional.';
  }
  
  if (diff > 0) {
    return `Você está se esforçando para aumentar este fator em ${absDiff} pontos acima de sua natureza. Esta adaptação pode ser benéfica no curto prazo, mas requer energia adicional. Avalie se o ambiente está aproveitando suas forças naturais ou se está exigindo mudanças excessivas que podem gerar tensão a longo prazo.`;
  }
  
  return `Você está reduzindo este fator em ${absDiff} pontos abaixo de sua natureza. Esta moderação pode ajudá-lo a se ajustar ao ambiente atual, mas certifique-se de que não está suprimindo características valiosas que poderiam ser melhor aproveitadas em outro contexto.`;
}
