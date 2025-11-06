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
      doc.setTextColor(107, 114, 128);
      doc.text('CIS Assessment - Relatório Confidencial', pageWidth - margin, 12, { align: 'right' });
    }
  };

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
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
      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const imgData = `data:image/png;base64,${base64}`;
      doc.addImage(imgData, 'PNG', x, y, width, height);
    } catch (e) {
      console.error('Error adding image:', e);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('[Gráfico não disponível]', x, y);
    }
  };

  // ========== PÁGINA 1: CAPA ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(30, 64, 175);
  doc.text('MAPEAMENTO DE PERFIL', pageWidth / 2, 80, { align: 'center' });
  doc.text('COMPORTAMENTAL', pageWidth / 2, 100, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text(assessment.candidate_name || 'N/A', pageWidth / 2, 140, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(107, 114, 128);
  doc.text(`Campanha: ${assessment.campaigns?.name || 'N/A'}`, pageWidth / 2, 160, { align: 'center' });
  doc.text(`Realizado em: ${new Date(assessment.created_at).toLocaleDateString('pt-BR')}`, pageWidth / 2, 175, { align: 'center' });

  // ========== PÁGINA 2: ÍNDICE ==========
  addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(30, 64, 175);
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
  doc.setTextColor(30, 64, 175);
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
  doc.setTextColor(30, 64, 175);
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
    doc.setTextColor(59, 130, 246);
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

  // ========== PÁGINA 5: PERFIL NATURAL ==========
  addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175);
  doc.text('INTENSIDADE DO PERFIL NATURAL', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text('(Como você realmente é)', margin, yPos);
  yPos += 12;

  // Scores
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const naturalScores = [
    { factor: 'D (Dominância):', value: result.natural_d },
    { factor: 'I (Influência):', value: result.natural_i },
    { factor: 'S (Estabilidade):', value: result.natural_s },
    { factor: 'C (Conformidade):', value: result.natural_c }
  ];

  naturalScores.forEach(score => {
    doc.setFont('helvetica', 'bold');
    doc.text(score.factor, margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${score.value}`, margin + 60, yPos);
    yPos += 8;
  });

  yPos += 5;
  if (result.primary_profile) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175);
  doc.text('INTENSIDADE DO PERFIL ADAPTADO', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text('(Como você se comporta no trabalho)', margin, yPos);
  yPos += 12;

  // Adapted scores
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const adaptedScores = [
    { factor: 'D (Dominância):', value: result.adapted_d },
    { factor: 'I (Influência):', value: result.adapted_i },
    { factor: 'S (Estabilidade):', value: result.adapted_s },
    { factor: 'C (Conformidade):', value: result.adapted_c }
  ];

  adaptedScores.forEach(score => {
    doc.setFont('helvetica', 'bold');
    doc.text(score.factor, margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${score.value}`, margin + 60, yPos);
    yPos += 8;
  });

  yPos += 8;
  if (result.tension_level) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246);
    const tensionText = result.tension_level === 'low' ? 'Baixo' : result.tension_level === 'medium' ? 'Médio' : 'Alto';
    doc.text(`Nível de Tensão: ${tensionText}`, margin, yPos);
    yPos += 10;

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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175);
  doc.text('COMO LIDA COM PROBLEMAS E DESAFIOS', margin, yPos);
  yPos += 12;

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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175);
  doc.text('PONTOS A DESENVOLVER', margin, yPos);
  yPos += 12;

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
    doc.setTextColor(30, 64, 175);
    doc.text('TIPOS PSICOLÓGICOS', margin, yPos);
    yPos += 12;

    const jungType = result.jung_type.type || 'N/A';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    doc.text('TEORIA DE VALORES', margin, yPos);
    yPos += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const valueNames: Record<string, string> = {
      social: 'Social',
      economic: 'Econômico',
      aesthetic: 'Estético',
      political: 'Político',
      spiritual: 'Espiritual',
      theoretical: 'Teórico'
    };

    Object.entries(result.values_scores).forEach(([key, value]) => {
      checkPageBreak(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${valueNames[key] || key}:`, margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${value}`, margin + 60, yPos);
      yPos += 8;
    });

    yPos += 10;
    if (chartImages.values) {
      checkPageBreak(75);
      await addImageFromUrl(chartImages.values, margin, yPos, contentWidth, 70);
      yPos += 75;
    }
  }

  // ========== PÁGINA 11: ESTILO DE LIDERANÇA ==========
  if (result.leadership_style) {
    addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    doc.text('ESTILO DE LIDERANÇA', margin, yPos);
    yPos += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const leadershipNames: Record<string, string> = {
      executive: 'Executivo',
      motivator: 'Motivador',
      methodical: 'Metódico',
      systematic: 'Sistemático'
    };

    Object.entries(result.leadership_style).forEach(([key, value]) => {
      checkPageBreak(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${leadershipNames[key] || key}:`, margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${value}%`, margin + 60, yPos);
      yPos += 8;
    });

    yPos += 10;
    if (chartImages.leadership) {
      checkPageBreak(75);
      await addImageFromUrl(chartImages.leadership, margin, yPos, contentWidth, 70);
      yPos += 75;
    }
  }

  // ========== PÁGINA 12: MAPA DE COMPETÊNCIAS ==========
  if (result.competencies && chartImages.competencies) {
    addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    doc.text('MAPA DE COMPETÊNCIAS', margin, yPos);
    yPos += 12;

    await addImageFromUrl(chartImages.competencies, margin, yPos, contentWidth, 100);
    yPos += 110;
  }

  // ========== PÁGINA 13: SUGESTÕES DE COMUNICAÇÃO ==========
  addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175);
  doc.text('SUGESTÕES PARA COMUNICAÇÃO', margin, yPos);
  yPos += 12;

  const commTips = getProfileCommunicationTips(result.primary_profile);
  if (commTips) {
    if (commTips.do && commTips.do.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text('O que fazer:', margin, yPos);
      yPos += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      commTips.do.forEach((tip: string) => {
        checkPageBreak(15);
        doc.text('✓', margin + 2, yPos);
        const tipLines = wrapText(tip, contentWidth - 10);
        tipLines.forEach((line: string, idx: number) => {
          doc.text(line, margin + 8, yPos);
          if (idx < tipLines.length - 1) yPos += 6;
        });
        yPos += 10;
      });

      yPos += 5;
    }

    if (commTips.dont && commTips.dont.length > 0) {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(245, 158, 11);
      doc.text('O que evitar:', margin, yPos);
      yPos += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      commTips.dont.forEach((tip: string) => {
        checkPageBreak(15);
        doc.text('✗', margin + 2, yPos);
        const tipLines = wrapText(tip, contentWidth - 10);
        tipLines.forEach((line: string, idx: number) => {
          doc.text(line, margin + 8, yPos);
          if (idx < tipLines.length - 1) yPos += 6;
        });
        yPos += 10;
      });
    }
  }

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
