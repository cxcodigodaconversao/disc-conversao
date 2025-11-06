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

    console.log('Generating PDF with SVG charts...');

    // Generate PDF document with embedded SVG charts
    const pdfBytes = await generatePDFDocument(assessment, result);
    
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

// ============= SVG CHART GENERATORS (FASE 1) =============

function generateDISCChartSVG(natural: number[], adapted: number[]): string {
  const width = 1200;
  const height = 600;
  const barWidth = 80;
  const maxValue = 40;
  const factors = ['D', 'I', 'S', 'C'];
  const labels = ['Dominância', 'Influência', 'Estabilidade', 'Conformidade'];
  const colors = ['#d9534f', '#f0ad4e', '#5cb85c', '#5bc0de'];
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="100%" height="100%" fill="white"/>`;
  
  // Título
  svg += `<text x="${width/2}" y="40" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle" fill="#d2bc8f">Perfil DISC - Natural vs Adaptado</text>`;
  
  // Subtítulo Perfil Natural
  svg += `<text x="300" y="80" font-family="Arial" font-size="18" font-weight="bold" text-anchor="middle" fill="#374151">Perfil Natural</text>`;
  
  // Gráfico Natural (lado esquerdo)
  natural.forEach((value, i) => {
    const x = 150 + (i * 100);
    const barHeight = (value / maxValue) * 400;
    const y = 520 - barHeight;
    
    // Barra
    svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${colors[i]}" rx="2"/>`;
    // Valor
    svg += `<text x="${x + barWidth/2}" y="${y - 10}" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle" fill="#374151">${value}</text>`;
    // Fator
    svg += `<text x="${x + barWidth/2}" y="550" font-family="Arial" font-size="20" font-weight="bold" text-anchor="middle" fill="${colors[i]}">${factors[i]}</text>`;
    // Label
    svg += `<text x="${x + barWidth/2}" y="570" font-family="Arial" font-size="11" text-anchor="middle" fill="#6b7280">${labels[i]}</text>`;
  });
  
  // Subtítulo Perfil Adaptado
  svg += `<text x="900" y="80" font-family="Arial" font-size="18" font-weight="bold" text-anchor="middle" fill="#374151">Perfil Adaptado</text>`;
  
  // Gráfico Adaptado (lado direito)
  adapted.forEach((value, i) => {
    const x = 750 + (i * 100);
    const barHeight = (value / maxValue) * 400;
    const y = 520 - barHeight;
    
    // Barra
    svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${colors[i]}" rx="2"/>`;
    // Valor
    svg += `<text x="${x + barWidth/2}" y="${y - 10}" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle" fill="#374151">${value}</text>`;
    // Fator
    svg += `<text x="${x + barWidth/2}" y="550" font-family="Arial" font-size="20" font-weight="bold" text-anchor="middle" fill="${colors[i]}">${factors[i]}</text>`;
    // Label
    svg += `<text x="${x + barWidth/2}" y="570" font-family="Arial" font-size="11" text-anchor="middle" fill="#6b7280">${labels[i]}</text>`;
  });
  
  // Linhas de grade
  for (let i = 0; i <= 40; i += 10) {
    const y = 520 - ((i / maxValue) * 400);
    svg += `<line x1="130" y1="${y}" x2="550" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
    svg += `<line x1="730" y1="${y}" x2="1150" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
    svg += `<text x="120" y="${y + 5}" font-family="Arial" font-size="10" text-anchor="end" fill="#9ca3af">${i}</text>`;
    svg += `<text x="1160" y="${y + 5}" font-family="Arial" font-size="10" text-anchor="start" fill="#9ca3af">${i}</text>`;
  }
  
  svg += '</svg>';
  return svg;
}

function generateValuesRadarSVG(values: any): string {
  const width = 800;
  const height = 800;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = 300;
  const maxValue = 60;
  
  const valueNames: Record<string, string> = {
    theoretical: 'Teórico',
    economic: 'Econômico',
    aesthetic: 'Estético',
    social: 'Social',
    political: 'Político',
    spiritual: 'Espiritual'
  };
  
  const angles = [0, 60, 120, 180, 240, 300]; // 6 eixos
  const orderedKeys = ['theoretical', 'economic', 'aesthetic', 'social', 'political', 'spiritual'];
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="100%" height="100%" fill="white"/>`;
  
  // Título
  svg += `<text x="${centerX}" y="40" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle" fill="#d2bc8f">Perfil de Valores Motivacionais</text>`;
  
  // Círculos de grade
  for (let i = 1; i <= 6; i++) {
    const r = (maxRadius / 6) * i;
    svg += `<circle cx="${centerX}" cy="${centerY}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="1"/>`;
    if (i % 2 === 0) {
      svg += `<text x="${centerX + 5}" y="${centerY - r - 5}" font-family="Arial" font-size="10" fill="#9ca3af">${i * 10}</text>`;
    }
  }
  
  // Eixos
  angles.forEach((angle, i) => {
    const rad = (angle - 90) * Math.PI / 180;
    const x2 = centerX + maxRadius * Math.cos(rad);
    const y2 = centerY + maxRadius * Math.sin(rad);
    
    svg += `<line x1="${centerX}" y1="${centerY}" x2="${x2}" y2="${y2}" stroke="#d1d5db" stroke-width="2"/>`;
    
    // Labels
    const labelDist = maxRadius + 40;
    const labelX = centerX + labelDist * Math.cos(rad);
    const labelY = centerY + labelDist * Math.sin(rad);
    const key = orderedKeys[i];
    const value = values[key] || 0;
    
    svg += `<text x="${labelX}" y="${labelY}" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="#374151">${valueNames[key]}</text>`;
    svg += `<text x="${labelX}" y="${labelY + 20}" font-family="Arial" font-size="12" text-anchor="middle" fill="#5bc0de">${value}/60</text>`;
  });
  
  // Dados (área preenchida)
  let pathData = 'M';
  angles.forEach((angle, i) => {
    const rad = (angle - 90) * Math.PI / 180;
    const key = orderedKeys[i];
    const value = values[key] || 0;
    const r = (value / maxValue) * maxRadius;
    const x = centerX + r * Math.cos(rad);
    const y = centerY + r * Math.sin(rad);
    
    if (i === 0) {
      pathData += ` ${x},${y}`;
    } else {
      pathData += ` L ${x},${y}`;
    }
  });
  pathData += ' Z';
  
  svg += `<path d="${pathData}" fill="#5bc0de" fill-opacity="0.3" stroke="#5bc0de" stroke-width="3"/>`;
  
  // Pontos de dados
  angles.forEach((angle, i) => {
    const rad = (angle - 90) * Math.PI / 180;
    const key = orderedKeys[i];
    const value = values[key] || 0;
    const r = (value / maxValue) * maxRadius;
    const x = centerX + r * Math.cos(rad);
    const y = centerY + r * Math.sin(rad);
    
    svg += `<circle cx="${x}" cy="${y}" r="6" fill="#5bc0de" stroke="white" stroke-width="2"/>`;
  });
  
  svg += '</svg>';
  return svg;
}

function generateLeadershipPieSVG(leadership: any): string {
  const width = 800;
  const height = 600;
  const centerX = 300;
  const centerY = 300;
  const radius = 180;
  
  const styles: Record<string, { label: string; color: string }> = {
    executive: { label: 'Executivo', color: '#d9534f' },
    motivator: { label: 'Motivador', color: '#f0ad4e' },
    systematic: { label: 'Sistemático', color: '#5cb85c' },
    methodical: { label: 'Metódico', color: '#5bc0de' }
  };
  
  const total = Object.values(leadership).reduce((sum: number, val: any) => sum + (val || 0), 0);
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="100%" height="100%" fill="white"/>`;
  
  // Título
  svg += `<text x="${width/2}" y="40" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle" fill="#d2bc8f">Estilos de Liderança</text>`;
  
  let currentAngle = -90;
  const entries = Object.entries(leadership);
  
  entries.forEach(([key, value]: [string, any], i) => {
    const percentage = (value / total) * 100;
    const sliceAngle = (value / total) * 360;
    const endAngle = currentAngle + sliceAngle;
    
    const startRad = currentAngle * Math.PI / 180;
    const endRad = endAngle * Math.PI / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const largeArc = sliceAngle > 180 ? 1 : 0;
    
    const pathData = `M ${centerX},${centerY} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
    
    svg += `<path d="${pathData}" fill="${styles[key].color}" stroke="white" stroke-width="2"/>`;
    
    // Label no centro do slice
    const midAngle = (currentAngle + endAngle) / 2;
    const midRad = midAngle * Math.PI / 180;
    const labelDist = radius * 0.7;
    const labelX = centerX + labelDist * Math.cos(midRad);
    const labelY = centerY + labelDist * Math.sin(midRad);
    
    svg += `<text x="${labelX}" y="${labelY}" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="white">${Math.round(percentage)}%</text>`;
    
    currentAngle = endAngle;
  });
  
  // Legenda
  let legendY = 120;
  entries.forEach(([key, value]: [string, any]) => {
    svg += `<rect x="550" y="${legendY}" width="20" height="20" fill="${styles[key].color}" rx="2"/>`;
    svg += `<text x="580" y="${legendY + 15}" font-family="Arial" font-size="14" fill="#374151">${styles[key].label}</text>`;
    legendY += 35;
  });
  
  svg += '</svg>';
  return svg;
}

function generateCompetenciesSVG(competencies: any): string {
  const width = 900;
  const height = 700;
  const margin = 60;
  const barHeight = 35;
  const maxValue = 40;
  
  const entries = Object.entries(competencies)
    .filter(([key]) => key.endsWith('_n'))
    .slice(0, 8)
    .map(([key, value]) => ({
      name: key.replace(/_n$/, '').replace(/_/g, ' ').toUpperCase(),
      value: value as number
    }))
    .sort((a, b) => b.value - a.value);
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="100%" height="100%" fill="white"/>`;
  
  // Título
  svg += `<text x="${width/2}" y="40" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle" fill="#d2bc8f">Mapa de Competências</text>`;
  
  let yPos = 100;
  
  entries.forEach((item) => {
    const barWidth = (item.value / maxValue) * (width - 2 * margin - 200);
    const color = item.value > 30 ? '#5cb85c' : item.value > 15 ? '#f0ad4e' : '#d9534f';
    const level = item.value > 30 ? 'Alto' : item.value > 15 ? 'Médio' : 'Baixo';
    
    // Nome da competência
    svg += `<text x="${margin}" y="${yPos + barHeight/2 + 5}" font-family="Arial" font-size="12" font-weight="bold" fill="#374151">${item.name}</text>`;
    
    // Barra
    svg += `<rect x="${margin + 200}" y="${yPos}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="3"/>`;
    
    // Valor e nível
    svg += `<text x="${margin + 200 + barWidth + 10}" y="${yPos + barHeight/2 + 5}" font-family="Arial" font-size="12" fill="#374151">${item.value}/40 (${level})</text>`;
    
    yPos += barHeight + 15;
  });
  
  // Linha de grade
  for (let i = 0; i <= 40; i += 10) {
    const x = margin + 200 + ((i / maxValue) * (width - 2 * margin - 200));
    svg += `<line x1="${x}" y1="80" x2="${x}" y2="${yPos - 15}" stroke="#e5e7eb" stroke-width="1"/>`;
    svg += `<text x="${x}" y="75" font-family="Arial" font-size="10" text-anchor="middle" fill="#9ca3af">${i}</text>`;
  }
  
  svg += '</svg>';
  return svg;
}

// ============= DADOS PARA ANÁLISE DE CONTRATAÇÃO =============

const PROFILE_BASE_DESCRIPTIONS: Record<string, any> = {
  D: {
    characteristics: 'Rápido, competitivo, direto, orientado a resultados',
    motivatingLanguage: 'Desafios, metas e autonomia',
    attentionPoint: 'Impaciência, pouca escuta'
  },
  I: {
    characteristics: 'Comunicativo, inspirador, otimista, social',
    motivatingLanguage: 'Reconhecimento, entusiasmo, ambiente leve',
    attentionPoint: 'Falta de foco e disciplina'
  },
  S: {
    characteristics: 'Calmo, cooperativo, empático, persistente',
    motivatingLanguage: 'Segurança, previsibilidade, pertencimento',
    attentionPoint: 'Resistência a mudanças'
  },
  C: {
    characteristics: 'Analítico, detalhista, metódico, racional',
    motivatingLanguage: 'Estrutura, clareza, perfeição',
    attentionPoint: 'Excesso de crítica e lentidão na decisão'
  }
};

const ROLE_MAPPINGS: Record<string, any> = {
  'SDR': {
    mostIndicated: ['D', 'I', 'DI', 'ID'],
    requiresAdaptation: ['C', 'S', 'SC', 'CS'],
    developmentRecommendations: 'Treinar ritmo, improviso e entusiasmo em contato frio. Desenvolver confiança na abordagem inicial.'
  },
  'Closer': {
    mostIndicated: ['D', 'C', 'DC', 'CD', 'DI'],
    requiresAdaptation: ['I', 'S', 'IS', 'SI'],
    developmentRecommendations: 'Desenvolver escuta ativa e leitura de perfil; treinar assertividade e técnica de fechamento estruturado.'
  },
  'Suporte/Atendimento': {
    mostIndicated: ['S', 'C', 'SC', 'CS', 'IS'],
    requiresAdaptation: ['D', 'I'],
    developmentRecommendations: 'Praticar empatia e paciência; criar checklists e rotinas de atendimento consistentes.'
  },
  'Gestor Comercial': {
    mostIndicated: ['D', 'S', 'DS', 'DI'],
    requiresAdaptation: ['I', 'C'],
    developmentRecommendations: 'Treinar liderança situacional, equilibrando pressão por resultados com empatia pela equipe.'
  },
  'Head/Estratégico': {
    mostIndicated: ['D', 'C', 'DC', 'CD'],
    requiresAdaptation: ['I', 'IS'],
    developmentRecommendations: 'Focar em visão analítica, delegar mais e dominar gestão de indicadores estratégicos.'
  }
};

const STRATEGIC_INTERPRETATIONS: Record<string, any> = {
  'DI': { potential: 'Alta performance em metas e execução; ótimo para ambiente de pressão', limitations: 'Impulsividade e tendência à centralização de decisões', hiringRecommendation: 'Ideal para SDR ou Closer sob liderança experiente que canalize sua energia' },
  'ID': { potential: 'Excelente em networking e influência; fecha vendas com carisma', limitations: 'Pode perder foco em processos estruturados', hiringRecommendation: 'Perfeito para vendas consultivas e expansão de mercado' },
  'IS': { potential: 'Comunicação humanizada, ótimo relacionamento interpessoal', limitations: 'Dificuldade com cobrança direta e confronto', hiringRecommendation: 'Bom para pós-venda, inside sales ou customer success' },
  'SI': { potential: 'Estabilidade com sociabilidade; mantém clientes por longo prazo', limitations: 'Ritmo mais lento em prospecção ativa', hiringRecommendation: 'Excelente para gestão de contas e retenção' },
  'DC': { potential: 'Visão estratégica, foco em processos e resultados mensuráveis', limitations: 'Pouca adaptabilidade e baixa empatia natural', hiringRecommendation: 'Excelente para gestor de performance, controle e analytics' },
  'CD': { potential: 'Precisão técnica com capacidade de execução', limitations: 'Pode ser inflexível em mudanças rápidas', hiringRecommendation: 'Ideal para implementação de processos e gestão de qualidade' },
  'SC': { potential: 'Metódico, confiável, disciplinado e detalhista', limitations: 'Evita conflitos, baixa velocidade de decisão', hiringRecommendation: 'Indicado para funções de suporte, operação e análise' },
  'CS': { potential: 'Organização com empatia; cria processos humanizados', limitations: 'Resistência a mudanças abruptas', hiringRecommendation: 'Perfeito para suporte técnico e treinamento' },
  'D': { potential: 'Foco extremo em resultados e liderança natural', limitations: 'Pode atropelar processos e pessoas', hiringRecommendation: 'Líder comercial ou gestor de expansão em ambientes desafiadores' },
  'I': { potential: 'Facilidade em inspirar e engajar equipes', limitations: 'Inconstância e dispersão em tarefas operacionais', hiringRecommendation: 'Potencial de liderança de equipe criativa ou social selling' },
  'S': { potential: 'Lealdade extrema e consistência operacional', limitations: 'Baixa adaptabilidade a mudanças', hiringRecommendation: 'Operações de suporte, atendimento ao cliente de longo prazo' },
  'C': { potential: 'Excelência técnica e atenção a detalhes', limitations: 'Lentidão na tomada de decisões práticas', hiringRecommendation: 'Analista de processos, controle de qualidade, compliance' }
};

const DECISION_MATRIX: Record<string, any> = {
  detailAttention: { question: 'O candidato tende a revisar antes de enviar?', highInterpretation: 'Alta = Conforme / Sólido para processos' },
  pressureDecision: { question: 'Reage rápido em situações de incerteza?', highInterpretation: 'Alta = Dominante / Ideal para metas agressivas' },
  energyLevel: { question: 'Demonstra entusiasmo e ritmo constante?', highInterpretation: 'Alta = Influente / Boa presença comercial' },
  interpersonalRelationship: { question: 'Conecta e mantém vínculos facilmente?', highInterpretation: 'Alta = Estável / Ideal para retenção de clientes' },
  changeFlexibility: { question: 'Adapta-se rápido a novas estratégias?', highInterpretation: 'Alta = Influente ou Dominante / útil em times dinâmicos' }
};

const EVOLUTION_SCALE: Record<string, any> = {
  'Básico': { description: 'Possui habilidades iniciais, requer acompanhamento', application: 'SDR em formação' },
  'Intermediário': { description: 'Já executa com autonomia e aprende rápido', application: 'Closer ou líder júnior' },
  'Avançado': { description: 'Alta adaptabilidade e visão sistêmica', application: 'Gestor Comercial' },
  'Sênior/Head': { description: 'Capacidade de multiplicar performance e treinar outros', application: 'Head Comercial ou Diretor de Expansão' }
};

const getCombinedProfile = (naturalD: number, naturalI: number, naturalS: number, naturalC: number): string => {
  const scores = [
    { factor: 'D', score: naturalD },
    { factor: 'I', score: naturalI },
    { factor: 'S', score: naturalS },
    { factor: 'C', score: naturalC }
  ].sort((a, b) => b.score - a.score);
  const threshold = 24;
  if (scores[0].score >= threshold && scores[1].score >= threshold) {
    return scores[0].factor + scores[1].factor;
  }
  return scores[0].factor;
};

const generateHiringConclusion = (combinedProfile: string, naturalD: number, naturalI: number, naturalS: number, naturalC: number, tensionLevel: string): string => {
  const interpretation = STRATEGIC_INTERPRETATIONS[combinedProfile] || STRATEGIC_INTERPRETATIONS['DI'];
  const profileFactors = combinedProfile.split('');
  const dominantTraits = profileFactors.map(f => {
    switch(f) {
      case 'D': return 'resultado';
      case 'I': return 'influência social';
      case 'S': return 'estabilidade';
      case 'C': return 'conformidade';
      default: return '';
    }
  }).join(' e ');
  const tensionText = tensionLevel === 'high' 
    ? 'Alta tensão entre perfil natural e adaptado sugere ambiente de pressão. Requer monitoramento de bem-estar.' 
    : tensionLevel === 'moderate'
    ? 'Tensão moderada indica adaptação controlada ao ambiente.'
    : 'Baixa tensão indica alinhamento entre perfil natural e demandas do ambiente.';
  return `O perfil identificado é ${combinedProfile}, com energia voltada a ${dominantTraits}. ${interpretation.hiringRecommendation} ${tensionText} Recomenda-se acompanhamento nos primeiros 90 dias com metas curtas e feedback semanal.`;
};

// ============= PDF GENERATION (FASE 2, 3, 4) =============

async function generatePDFDocument(assessment: any, result: any): Promise<Uint8Array> {
  const SITE_COLORS = {
    primary: [210, 188, 143] as [number, number, number],        // Gold #d2bc8f
    background: [12, 18, 28] as [number, number, number],
    card: [26, 35, 50] as [number, number, number],
    foreground: [255, 255, 255] as [number, number, number],
    success: [92, 184, 92] as [number, number, number],          // Green
    warning: [240, 173, 78] as [number, number, number],         // Orange
    danger: [217, 83, 79] as [number, number, number],           // Red
    info: [91, 192, 222] as [number, number, number],            // Blue
    discD: [217, 83, 79] as [number, number, number],
    discI: [240, 173, 78] as [number, number, number],
    discS: [92, 184, 92] as [number, number, number],
    discC: [91, 192, 222] as [number, number, number],
    textPrimary: [255, 255, 255] as [number, number, number],
    textSecondary: [160, 174, 192] as [number, number, number],
    textMuted: [107, 114, 128] as [number, number, number],
    textDark: [17, 24, 39] as [number, number, number],
    textMedium: [55, 65, 81] as [number, number, number]
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
      doc.text('DISC da Conversão - Relatório Confidencial', pageWidth - margin, 12, { align: 'right' });
    }
  };

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(...SITE_COLORS.textMuted);
    doc.text(`© 2025 DISC da Conversão - Página ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - 30) {
      addPage();
    }
  };

  const wrapText = (text: string, maxWidth: number): string[] => {
    return doc.splitTextToSize(text, maxWidth);
  };

  // Drawing functions for charts
  const drawDISCChart = (
    naturalArr: number[],
    adaptedArr: number[],
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const barWidth = 15;
    const spacing = 20;
    const maxValue = 40;
    const chartHeight = height - 40;
    const factors = ['D', 'I', 'S', 'C'];
    const labels = ['Dominância', 'Influência', 'Estabilidade', 'Conformidade'];
    const colors: Record<string, [number, number, number]> = {
      D: [217, 83, 79],
      I: [240, 173, 78],
      S: [92, 184, 92],
      C: [91, 192, 222]
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...SITE_COLORS.primary);
    doc.text('Perfil DISC', x + width / 2, y + 5, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(...SITE_COLORS.textMedium);
    doc.text('Natural', x + width / 4, y + 12, { align: 'center' });
    doc.text('Adaptado', x + (3 * width) / 4, y + 12, { align: 'center' });

    const baseY = y + height - 15;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(x + 5, baseY, x + width - 5, baseY);

    naturalArr.forEach((value, i) => {
      const barX = x + 12 + i * spacing;
      const barHeight = (value / maxValue) * chartHeight;
      const barY = baseY - barHeight;

      doc.setFillColor(...colors[factors[i]]);
      doc.rect(barX, barY, barWidth, barHeight, 'F');

      doc.setFontSize(8);
      doc.setTextColor(...SITE_COLORS.textDark);
      doc.text(value.toString(), barX + barWidth / 2, barY - 1, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors[factors[i]]);
      doc.text(factors[i], barX + barWidth / 2, baseY + 5, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...SITE_COLORS.textMuted);
      doc.text(labels[i], barX + barWidth / 2, baseY + 9, { align: 'center' });
    });

    adaptedArr.forEach((value, i) => {
      const barX = x + width / 2 + 12 + i * spacing;
      const barHeight = (value / maxValue) * chartHeight;
      const barY = baseY - barHeight;

      doc.setFillColor(...colors[factors[i]]);
      doc.rect(barX, barY, barWidth, barHeight, 'F');

      doc.setFontSize(8);
      doc.setTextColor(...SITE_COLORS.textDark);
      doc.text(value.toString(), barX + barWidth / 2, barY - 1, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors[factors[i]]);
      doc.text(factors[i], barX + barWidth / 2, baseY + 5, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...SITE_COLORS.textMuted);
      doc.text(labels[i], barX + barWidth / 2, baseY + 9, { align: 'center' });
    });
  };

  const drawValuesRadar = (valuesObj: any, x: number, y: number, size: number) => {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size / 2 - 20;
    const numValues = 6;
    const maxValue = 60;

    const valueNames: Record<string, string> = {
      theoretical: 'Teórico',
      economic: 'Econômico',
      aesthetic: 'Estético',
      social: 'Social',
      political: 'Político',
      spiritual: 'Espiritual'
    };
    
    const orderedKeys = ['theoretical', 'economic', 'aesthetic', 'social', 'political', 'spiritual'];

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    for (let i = 1; i <= 4; i++) {
      const r = (radius / 4) * i;
      doc.circle(centerX, centerY, r, 'S');
    }

    for (let i = 0; i < numValues; i++) {
      const angle = (i * 2 * Math.PI) / numValues - Math.PI / 2;
      const endX = centerX + radius * Math.cos(angle);
      const endY = centerY + radius * Math.sin(angle);
      
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(centerX, centerY, endX, endY);
      
      const labelDist = radius + 8;
      const labelX = centerX + labelDist * Math.cos(angle);
      const labelY = centerY + labelDist * Math.sin(angle);
      
      const key = orderedKeys[i];
      const value = valuesObj[key] || 0;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...SITE_COLORS.textDark);
      doc.text(valueNames[key], labelX, labelY, { align: 'center', maxWidth: 20 });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...SITE_COLORS.info);
      doc.text(`${value}`, labelX, labelY + 3, { align: 'center' });
    }

    const path: [number, number][] = [];
    orderedKeys.forEach((key, i) => {
      const value = valuesObj[key] || 0;
      const normalizedValue = (value / maxValue) * radius;
      const angle = (i * 2 * Math.PI) / numValues - Math.PI / 2;
      const pointX = centerX + normalizedValue * Math.cos(angle);
      const pointY = centerY + normalizedValue * Math.sin(angle);
      path.push([pointX, pointY]);
    });

    if (path.length > 0) {
      doc.setDrawColor(91, 192, 222);
      doc.setLineWidth(0.5);
      
      for (let i = 0; i < path.length; i++) {
        const nextI = (i + 1) % path.length;
        doc.line(path[i][0], path[i][1], path[nextI][0], path[nextI][1]);
      }
      
      path.forEach(([px, py]) => {
        doc.setFillColor(91, 192, 222);
        doc.circle(px, py, 1, 'F');
      });
    }
  };

  const drawLeadershipPie = (leadershipObj: any, x: number, y: number, radius: number) => {
    const centerX = x + radius;
    const centerY = y + radius;

    const styles: Record<string, { label: string; color: [number, number, number] }> = {
      executive: { label: 'Executivo', color: [217, 83, 79] },
      motivator: { label: 'Motivador', color: [240, 173, 78] },
      systematic: { label: 'Sistemático', color: [92, 184, 92] },
      methodical: { label: 'Metódico', color: [91, 192, 222] }
    };

    const total = Object.values(leadershipObj).reduce((sum: number, val: any) => sum + (val || 0), 0);
    let currentAngle = -90;

    Object.entries(leadershipObj).forEach(([key, value]: [string, any]) => {
      const percentage = (value / total) * 100;
      const sliceAngle = (value / total) * 360;

      doc.setFillColor(...styles[key].color);

      const startRad = (currentAngle * Math.PI) / 180;
      const endRad = ((currentAngle + sliceAngle) * Math.PI) / 180;

      const steps = Math.max(20, Math.ceil(sliceAngle / 2));
      for (let i = 0; i <= steps; i++) {
        const angle = startRad + ((endRad - startRad) * i) / steps;
        const px = centerX + radius * Math.cos(angle);
        const py = centerY + radius * Math.sin(angle);

        if (i === 0) {
          doc.line(centerX, centerY, px, py);
        } else {
          const prevAngle = startRad + ((endRad - startRad) * (i - 1)) / steps;
          const prevX = centerX + radius * Math.cos(prevAngle);
          const prevY = centerY + radius * Math.sin(prevAngle);
          doc.line(prevX, prevY, px, py);
        }
      }
      doc.line(centerX + radius * Math.cos(endRad), centerY + radius * Math.sin(endRad), centerX, centerY);

      const labelAngle = currentAngle + sliceAngle / 2;
      const labelRad = (labelAngle * Math.PI) / 180;
      const labelX = centerX + (radius * 0.65) * Math.cos(labelRad);
      const labelY = centerY + (radius * 0.65) * Math.sin(labelRad);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${Math.round(percentage)}%`, labelX, labelY, { align: 'center' });

      currentAngle += sliceAngle;
    });

    let legendY = y;
    Object.entries(leadershipObj).forEach(([key, value]: [string, any]) => {
      doc.setFillColor(...styles[key].color);
      doc.rect(x + radius * 2 + 10, legendY, 5, 5, 'F');
      
      doc.setTextColor(...SITE_COLORS.textDark);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(styles[key].label, x + radius * 2 + 18, legendY + 4);
      
      legendY += 8;
    });
  };

  const drawCompetenciesBar = (competenciesObj: any, x: number, y: number, width: number, height: number) => {
    const entries = Object.entries(competenciesObj)
      .filter(([key]) => key.endsWith('_n'))
      .slice(0, 8)
      .map(([key, value]) => ({
        name: key.replace(/_n$/, '').replace(/_/g, ' ').toUpperCase(),
        value: value as number
      }))
      .sort((a, b) => b.value - a.value);

    const barHeight = 10;
    const spacing = 5;
    const maxValue = 40;
    const maxBarWidth = width - 80;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    entries.forEach((item, i) => {
      const barY = y + i * (barHeight + spacing);
      const barWidth = (item.value / maxValue) * maxBarWidth;
      const color = item.value > 30 ? [92, 184, 92] : item.value > 15 ? [240, 173, 78] : [217, 83, 79];

      doc.setTextColor(...SITE_COLORS.textDark);
      const displayName = item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name;
      doc.text(displayName, x, barY + barHeight / 2 + 1.5);

      doc.setFillColor(...(color as [number, number, number]));
      doc.rect(x + 50, barY, barWidth, barHeight, 'F');

      doc.setTextColor(...SITE_COLORS.textDark);
      doc.text(`${item.value}`, x + 50 + barWidth + 2, barY + barHeight / 2 + 1.5);
    });
  };

  const addSectionTitle = (title: string, color: [number, number, number] = SITE_COLORS.primary) => {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(title, margin, yPos);
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

  const addText = (text: string, size = 11, weight: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(...SITE_COLORS.textDark);
    const lines = wrapText(text, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(8);
      doc.text(line, margin, yPos);
      yPos += 6;
    });
  };

  const addBulletPoint = (text: string) => {
    checkPageBreak(8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...SITE_COLORS.textDark);
    doc.text('•', margin + 2, yPos);
    const lines = wrapText(text, contentWidth - 10);
    lines.forEach((line: string, i: number) => {
      doc.text(line, margin + 7, yPos);
      if (i < lines.length - 1) {
        yPos += 6;
        checkPageBreak(8);
      }
    });
    yPos += 7;
  };

  // ========== PÁGINA 1: CAPA ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(...SITE_COLORS.primary);
  doc.text('MAPEAMENTO DE PERFIL', pageWidth / 2, 80, { align: 'center' });
  doc.text('COMPORTAMENTAL', pageWidth / 2, 100, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(...SITE_COLORS.textMuted);
  doc.text('Relatório Completo de Análise', pageWidth / 2, 120, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(22);
  doc.setTextColor(...SITE_COLORS.textDark);
  doc.text(assessment.candidate_name || 'N/A', pageWidth / 2, 150, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(...SITE_COLORS.textMuted);
  doc.text(`Campanha: ${assessment.campaigns?.name || 'N/A'}`, pageWidth / 2, 170, { align: 'center' });
  doc.text(`Realizado em: ${new Date(assessment.created_at).toLocaleDateString('pt-BR')}`, pageWidth / 2, 185, { align: 'center' });

  // ========== PÁGINA 2: ÍNDICE ==========
  addPage();
  addSectionTitle('SUMÁRIO');

  const sections = [
    '1. INTRODUÇÃO AO RELATÓRIO',
    '2. METODOLOGIA DISC',
    '3. GRÁFICO DISC - PERFIL NATURAL VS ADAPTADO',
    '4. ANÁLISE DO FATOR D - DOMINÂNCIA',
    '5. ANÁLISE DO FATOR I - INFLUÊNCIA',
    '6. ANÁLISE DO FATOR S - ESTABILIDADE',
    '7. ANÁLISE DO FATOR C - CONFORMIDADE',
    '8. PERFIL COMPORTAMENTAL PRIMÁRIO',
    '9. PERFIL COMPORTAMENTAL SECUNDÁRIO',
    '10. ANÁLISE DE TENSÃO (NATURAL VS ADAPTADO)',
    '11. RESOLUÇÃO DE PROBLEMAS',
    '12. PONTOS DE DESENVOLVIMENTO',
    '13. VALORES MOTIVACIONAIS',
    '14. TIPOLOGIA PSICOLÓGICA DE JUNG',
    '15. ESTILOS DE LIDERANÇA',
    '16. MAPA DE COMPETÊNCIAS',
    '17. SUGESTÕES PARA COMUNICAÇÃO',
    '18. PLANO DE AÇÃO PERSONALIZADO',
    '19. GRÁFICOS CONSOLIDADOS',
    '20. CONSIDERAÇÕES FINAIS',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...SITE_COLORS.textDark);
  sections.forEach((section, i) => {
    checkPageBreak(10);
    doc.text(section, margin + 5, yPos);
    doc.text(`${i + 3}`, pageWidth - margin - 10, yPos, { align: 'right' });
    yPos += 8;
  });

  // ========== PÁGINA 3: INTRODUÇÃO ==========
  addPage();
  addSectionTitle('INTRODUÇÃO AO RELATÓRIO');

  const introParagraphs = [
    'O Relatório DISC da Conversão foi desenvolvido para melhor compreender a personalidade e as potenciais competências dos indivíduos. Entender quais são os pontos fortes e as oportunidades de melhoria para, assim, promover tanto o desenvolvimento pessoal e profissional, como também para melhorar o nível de satisfação interna e externa.',
    'Pesquisas na área do desenvolvimento humano mostram que os indivíduos mais eficazes são aqueles que conhecem melhor a si mesmos.',
    'Em nosso software medimos seis dimensões principais:'
  ];

  introParagraphs.forEach(para => {
    addText(para);
    yPos += 3;
  });

  yPos += 5;
  const dimensions = [
    '1. Intensidade de Perfil Comportamental (DISC)',
    '2. Motivadores e adequação profissional',
    '3. Estilo de Liderança',
    '4. Tipo Psicológico (Jung)',
    '5. Mapeamento de competências',
    '6. Inteligências múltiplas'
  ];

  dimensions.forEach(dim => {
    addBulletPoint(dim);
  });

  yPos += 10;
  addSubtitle('Objetivo do Relatório');
  addText('Este relatório fornece uma análise detalhada e personalizada do perfil comportamental de ' + assessment.candidate_name + ', oferecendo insights valiosos para desenvolvimento pessoal, tomada de decisões de carreira e otimização de relações interpessoais no ambiente profissional.');

  // ========== PÁGINA 4: METODOLOGIA DISC ==========
  addPage();
  addSectionTitle('METODOLOGIA DISC');

  addText('Em 1928, o Doutor em Psicologia William Moulton Marston desenvolveu um método de compreensão dos padrões de comportamento humano. A metodologia DISC identifica quatro dimensões principais do comportamento:');
  yPos += 8;

  const discFactors = [
    {
      letter: 'D - DOMINÂNCIA',
      color: SITE_COLORS.discD,
      desc: 'Como a pessoa enfrenta problemas e desafios. Pessoas com alto D são assertivas, diretas, focadas em resultados e gostam de ter controle sobre situações.'
    },
    {
      letter: 'I - INFLUÊNCIA',
      color: SITE_COLORS.discI,
      desc: 'Como a pessoa interage e influencia outras pessoas. Pessoas com alto I são comunicativas, entusiastas, persuasivas e gostam de trabalhar em equipe.'
    },
    {
      letter: 'S - ESTABILIDADE',
      color: SITE_COLORS.discS,
      desc: 'Como a pessoa responde a mudanças e ao ritmo do ambiente. Pessoas com alto S são pacientes, leais, cooperativas e preferem estabilidade e previsibilidade.'
    },
    {
      letter: 'C - CONFORMIDADE',
      color: SITE_COLORS.discC,
      desc: 'Como a pessoa responde a regras e procedimentos estabelecidos. Pessoas com alto C são analíticas, precisas, sistemáticas e seguem padrões de qualidade.'
    }
  ];

  discFactors.forEach(factor => {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(factor.color[0], factor.color[1], factor.color[2]);
    doc.text(factor.letter, margin, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...SITE_COLORS.textDark);
    const lines = wrapText(factor.desc, contentWidth - 5);
    lines.forEach((line: string) => {
      doc.text(line, margin + 5, yPos);
      yPos += 6;
    });
    yPos += 5;
  });

  yPos += 5;
  addSubtitle('Perfil Natural vs Perfil Adaptado');
  addText('O Perfil Natural representa como você é naturalmente, seus comportamentos espontâneos e preferências inatas. O Perfil Adaptado mostra como você se ajusta ao ambiente profissional ou a situações específicas. A diferença entre esses dois perfis indica o nível de adaptação que você está exercendo.');

  // ========== PÁGINA 5: GRÁFICO DISC ==========
  addPage();
  addSectionTitle('PERFIL DISC COMPLETO');

  const naturalValues = [result.natural_d, result.natural_i, result.natural_s, result.natural_c];
  const adaptedValues = [result.adapted_d, result.adapted_i, result.adapted_s, result.adapted_c];
  
  checkPageBreak(120);
  drawDISCChart(naturalValues, adaptedValues, margin, yPos, contentWidth, 100);
  yPos += 110;

  addSubtitle('Interpretação dos Resultados');
  addText('Os gráficos acima mostram sua pontuação em cada fator DISC (escala de 0 a 40). Valores acima de 30 indicam alta intensidade, entre 15-30 intensidade média, e abaixo de 15 baixa intensidade.');

  // ========== PÁGINA 6: ANÁLISE FATOR D ==========
  addPage();
  addSectionTitle('ANÁLISE DO FATOR D - DOMINÂNCIA', SITE_COLORS.discD);

  const dLevel = result.natural_d > 30 ? 'Alto' : result.natural_d > 15 ? 'Médio' : 'Baixo';
  const dAdaptedLevel = result.adapted_d > 30 ? 'Alto' : result.adapted_d > 15 ? 'Médio' : 'Baixo';

  addSubtitle('Pontuação');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.discD);
  doc.text(`Perfil Natural: ${result.natural_d}/40 (${dLevel})`, margin + 5, yPos);
  yPos += 8;
  doc.text(`Perfil Adaptado: ${result.adapted_d}/40 (${dAdaptedLevel})`, margin + 5, yPos);
  yPos += 12;

  addSubtitle('O que significa Dominância?');
  addText('O fator D mede como você lida com problemas, desafios e situações de pressão. Indica seu nível de assertividade, competitividade e foco em resultados.');
  yPos += 5;

  addSubtitle('Características do seu perfil');
  
  if (result.natural_d > 30) {
    const highDBehaviors = [
      'Gosta de assumir controle e tomar decisões rapidamente',
      'É direto e assertivo na comunicação',
      'Busca resultados e ação imediata',
      'Aceita desafios e gosta de competição',
      'Pode ser percebido como impaciente com detalhes'
    ];
    highDBehaviors.forEach(b => addBulletPoint(b));
  } else if (result.natural_d > 15) {
    const medDBehaviors = [
      'Equilibra assertividade com cooperação',
      'Toma decisões de forma ponderada',
      'Aceita desafios quando necessário',
      'Busca resultados mas considera diferentes perspectivas'
    ];
    medDBehaviors.forEach(b => addBulletPoint(b));
  } else {
    const lowDBehaviors = [
      'Prefere ambientes colaborativos a competitivos',
      'Evita confrontos diretos',
      'Pondera cuidadosamente antes de decidir',
      'Valoriza harmonia e consenso',
      'Pode precisar de mais tempo para assumir riscos'
    ];
    lowDBehaviors.forEach(b => addBulletPoint(b));
  }

  yPos += 5;
  const dTension = Math.abs(result.natural_d - result.adapted_d);
  if (dTension > 10) {
    addSubtitle('Análise de Adaptação');
    if (result.adapted_d > result.natural_d) {
      addText(`Você está elevando seu nível de Dominância em ${dTension} pontos. Isso indica que o ambiente profissional exige mais assertividade e tomada de decisões do que seu padrão natural. Isso pode gerar cansaço se mantido por períodos prolongados.`);
    } else {
      addText(`Você está reduzindo seu nível de Dominância em ${dTension} pontos. Isso indica que está se adaptando a um ambiente que requer mais colaboração e menos assertividade do que seu padrão natural.`);
    }
  }

  // ========== PÁGINA 7: ANÁLISE FATOR I ==========
  addPage();
  addSectionTitle('ANÁLISE DO FATOR I - INFLUÊNCIA', SITE_COLORS.discI);

  const iLevel = result.natural_i > 30 ? 'Alto' : result.natural_i > 15 ? 'Médio' : 'Baixo';
  const iAdaptedLevel = result.adapted_i > 30 ? 'Alto' : result.adapted_i > 15 ? 'Médio' : 'Baixo';

  addSubtitle('Pontuação');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.discI);
  doc.text(`Perfil Natural: ${result.natural_i}/40 (${iLevel})`, margin + 5, yPos);
  yPos += 8;
  doc.text(`Perfil Adaptado: ${result.adapted_i}/40 (${iAdaptedLevel})`, margin + 5, yPos);
  yPos += 12;

  addSubtitle('O que significa Influência?');
  addText('O fator I mede como você se relaciona e influencia outras pessoas. Indica seu nível de sociabilidade, entusiasmo e capacidade de persuasão.');
  yPos += 5;

  addSubtitle('Características do seu perfil');
  
  if (result.natural_i > 30) {
    const highIBehaviors = [
      'Altamente comunicativo e expressivo',
      'Gosta de trabalhar em equipe e fazer networking',
      'Entusiasta e otimista',
      'Persuasivo e inspirador',
      'Pode ser percebido como emotivo ou excessivamente falante'
    ];
    highIBehaviors.forEach(b => addBulletPoint(b));
  } else if (result.natural_i > 15) {
    const medIBehaviors = [
      'Equilibra momentos sociais com momentos de foco',
      'Comunica-se bem quando necessário',
      'Trabalha tanto sozinho quanto em equipe',
      'Persuasivo em situações apropriadas'
    ];
    medIBehaviors.forEach(b => addBulletPoint(b));
  } else {
    const lowIBehaviors = [
      'Prefere comunicação objetiva e direta',
      'Trabalha bem de forma independente',
      'Mais reservado em interações sociais',
      'Foca em fatos e dados ao invés de emoções',
      'Pode precisar de mais tempo para construir relacionamentos'
    ];
    lowIBehaviors.forEach(b => addBulletPoint(b));
  }

  yPos += 5;
  const iTension = Math.abs(result.natural_i - result.adapted_i);
  if (iTension > 10) {
    addSubtitle('Análise de Adaptação');
    if (result.adapted_i > result.natural_i) {
      addText(`Você está elevando seu nível de Influência em ${iTension} pontos. Isso indica que o ambiente profissional demanda mais interação social e persuasão do que seu padrão natural.`);
    } else {
      addText(`Você está reduzindo seu nível de Influência em ${iTension} pontos. Isso sugere que está se adaptando a um ambiente que requer mais foco e menos interação social.`);
    }
  }

  // ========== PÁGINA 8: ANÁLISE FATOR S ==========
  addPage();
  addSectionTitle('ANÁLISE DO FATOR S - ESTABILIDADE', SITE_COLORS.discS);

  const sLevel = result.natural_s > 30 ? 'Alto' : result.natural_s > 15 ? 'Médio' : 'Baixo';
  const sAdaptedLevel = result.adapted_s > 30 ? 'Alto' : result.adapted_s > 15 ? 'Médio' : 'Baixo';

  addSubtitle('Pontuação');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.discS);
  doc.text(`Perfil Natural: ${result.natural_s}/40 (${sLevel})`, margin + 5, yPos);
  yPos += 8;
  doc.text(`Perfil Adaptado: ${result.adapted_s}/40 (${sAdaptedLevel})`, margin + 5, yPos);
  yPos += 12;

  addSubtitle('O que significa Estabilidade?');
  addText('O fator S mede como você responde a mudanças e ao ritmo do ambiente. Indica seu nível de paciência, consistência e preferência por estabilidade versus mudança.');
  yPos += 5;

  addSubtitle('Características do seu perfil');
  
  if (result.natural_s > 30) {
    const highSBehaviors = [
      'Prefere ambientes estáveis e previsíveis',
      'Paciente e consistente no trabalho',
      'Leal e confiável',
      'Bom ouvinte e mediador',
      'Pode ter dificuldade com mudanças abruptas'
    ];
    highSBehaviors.forEach(b => addBulletPoint(b));
  } else if (result.natural_s > 15) {
    const medSBehaviors = [
      'Equilibra estabilidade com flexibilidade',
      'Adapta-se a mudanças quando necessário',
      'Mantém consistência mas aceita novidades',
      'Trabalha em ritmo moderado'
    ];
    medSBehaviors.forEach(b => addBulletPoint(b));
  } else {
    const lowSBehaviors = [
      'Gosta de mudanças e novos desafios',
      'Trabalha bem em ambientes dinâmicos',
      'Multitarefa com facilidade',
      'Impaciente com rotina',
      'Busca variedade e estimulação'
    ];
    lowSBehaviors.forEach(b => addBulletPoint(b));
  }

  yPos += 5;
  const sTension = Math.abs(result.natural_s - result.adapted_s);
  if (sTension > 10) {
    addSubtitle('Análise de Adaptação');
    if (result.adapted_s > result.natural_s) {
      addText(`Você está elevando seu nível de Estabilidade em ${sTension} pontos. Isso indica que está se adaptando a um ambiente que requer mais paciência e consistência do que seu padrão natural.`);
    } else {
      addText(`Você está reduzindo seu nível de Estabilidade em ${sTension} pontos. Isso sugere que está lidando com um ambiente mais dinâmico e com mais mudanças do que prefere naturalmente.`);
    }
  }

  // ========== PÁGINA 9: ANÁLISE FATOR C ==========
  addPage();
  addSectionTitle('ANÁLISE DO FATOR C - CONFORMIDADE', SITE_COLORS.discC);

  const cLevel = result.natural_c > 30 ? 'Alto' : result.natural_c > 15 ? 'Médio' : 'Baixo';
  const cAdaptedLevel = result.adapted_c > 30 ? 'Alto' : result.adapted_c > 15 ? 'Médio' : 'Baixo';

  addSubtitle('Pontuação');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.discC);
  doc.text(`Perfil Natural: ${result.natural_c}/40 (${cLevel})`, margin + 5, yPos);
  yPos += 8;
  doc.text(`Perfil Adaptado: ${result.adapted_c}/40 (${cAdaptedLevel})`, margin + 5, yPos);
  yPos += 12;

  addSubtitle('O que significa Conformidade?');
  addText('O fator C mede como você responde a regras, procedimentos e padrões de qualidade. Indica seu nível de atenção a detalhes, precisão e sistematização.');
  yPos += 5;

  addSubtitle('Características do seu perfil');
  
  if (result.natural_c > 30) {
    const highCBehaviors = [
      'Altamente analítico e detalhista',
      'Segue procedimentos e padrões rigorosamente',
      'Busca precisão e qualidade',
      'Planeja cuidadosamente antes de agir',
      'Pode ser percebido como perfeccionista ou crítico'
    ];
    highCBehaviors.forEach(b => addBulletPoint(b));
  } else if (result.natural_c > 15) {
    const medCBehaviors = [
      'Equilibra análise com ação',
      'Segue regras importantes mas é flexível quando necessário',
      'Atento a detalhes relevantes',
      'Busca qualidade sem ser excessivamente crítico'
    ];
    medCBehaviors.forEach(b => addBulletPoint(b));
  } else {
    const lowCBehaviors = [
      'Prefere visão ampla a detalhes minuciosos',
      'Flexível com regras e procedimentos',
      'Toma decisões com base em intuição',
      'Adapta-se rapidamente sem análise excessiva',
      'Pode precisar de mais atenção a detalhes importantes'
    ];
    lowCBehaviors.forEach(b => addBulletPoint(b));
  }

  yPos += 5;
  const cTension = Math.abs(result.natural_c - result.adapted_c);
  if (cTension > 10) {
    addSubtitle('Análise de Adaptação');
    if (result.adapted_c > result.natural_c) {
      addText(`Você está elevando seu nível de Conformidade em ${cTension} pontos. Isso indica que o ambiente profissional demanda mais atenção a detalhes e procedimentos do que seu padrão natural.`);
    } else {
      addText(`Você está reduzindo seu nível de Conformidade em ${cTension} pontos. Isso sugere que está trabalhando em um ambiente mais flexível e menos estruturado do que prefere naturalmente.`);
    }
  }

  // ========== PÁGINA 10: PERFIL PRIMÁRIO ==========
  addPage();
  addSectionTitle('PERFIL COMPORTAMENTAL PRIMÁRIO');

  const profiles: Record<string, { name: string; color: [number, number, number] }> = {
    D: { name: 'Executor', color: SITE_COLORS.discD },
    I: { name: 'Comunicador', color: SITE_COLORS.discI },
    S: { name: 'Planejador', color: SITE_COLORS.discS },
    C: { name: 'Analista', color: SITE_COLORS.discC }
  };

  const maxFactor = Math.max(result.natural_d, result.natural_i, result.natural_s, result.natural_c);
  let primaryProfile = 'D';
  if (maxFactor === result.natural_i) primaryProfile = 'I';
  else if (maxFactor === result.natural_s) primaryProfile = 'S';
  else if (maxFactor === result.natural_c) primaryProfile = 'C';

  const profileData = profiles[primaryProfile];
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(profileData.color[0], profileData.color[1], profileData.color[2]);
  doc.text(`Seu perfil primário é: ${profileData.name}`, margin, yPos);
  yPos += 15;

  addSubtitle('Descrição do Perfil');
  
  if (primaryProfile === 'D') {
    addText('Como Executor, você é orientado para resultados, assertivo e gosta de assumir controle. Você enfrenta desafios diretamente e busca constantemente superar obstáculos.');
    yPos += 5;
    addSubtitle('Pontos Fortes');
    ['Tomada de decisões rápida e eficaz', 'Coragem para assumir riscos calculados', 'Foco em resultados e objetivos', 'Liderança natural em situações de pressão'].forEach(p => addBulletPoint(p));
    yPos += 5;
    addSubtitle('Áreas de Atenção');
    ['Pode ser percebido como impaciente', 'Tendência a ignorar detalhes', 'Pode ser excessivamente direto', 'Dificuldade em delegar controle'].forEach(p => addBulletPoint(p));
  } else if (primaryProfile === 'I') {
    addText('Como Comunicador, você é sociável, entusiasta e persuasivo. Você influencia positivamente as pessoas ao seu redor e cria ambientes colaborativos.');
    yPos += 5;
    addSubtitle('Pontos Fortes');
    ['Excelente comunicação e networking', 'Capacidade de inspirar e motivar equipes', 'Otimismo e energia contagiante', 'Criatividade e inovação'].forEach(p => addBulletPoint(p));
    yPos += 5;
    addSubtitle('Áreas de Atenção');
    ['Pode ser percebido como desorganizado', 'Tendência a prometer demais', 'Dificuldade com tarefas repetitivas', 'Pode evitar confrontos necessários'].forEach(p => addBulletPoint(p));
  } else if (primaryProfile === 'S') {
    addText('Como Planejador, você é paciente, confiável e consistente. Você valoriza estabilidade e prefere trabalhar em ambientes harmoniosos e previsíveis.');
    yPos += 5;
    addSubtitle('Pontos Fortes');
    ['Confiabilidade e lealdade', 'Excelente trabalho em equipe', 'Paciência e persistência', 'Habilidade de escuta e mediação'].forEach(p => addBulletPoint(p));
    yPos += 5;
    addSubtitle('Áreas de Atenção');
    ['Resistência a mudanças rápidas', 'Dificuldade em dizer não', 'Pode evitar confrontos necessários', 'Tendência a manter status quo'].forEach(p => addBulletPoint(p));
  } else {
    addText('Como Analista, você é preciso, sistemático e focado em qualidade. Você analisa situações cuidadosamente antes de agir e segue padrões estabelecidos.');
    yPos += 5;
    addSubtitle('Pontos Fortes');
    ['Alta precisão e atenção a detalhes', 'Pensamento analítico e crítico', 'Organização e planejamento', 'Foco em qualidade e excelência'].forEach(p => addBulletPoint(p));
    yPos += 5;
    addSubtitle('Áreas de Atenção');
    ['Pode ser excessivamente crítico', 'Tendência ao perfeccionismo', 'Dificuldade com prazos apertados', 'Pode ser percebido como distante'].forEach(p => addBulletPoint(p));
  }

  // ========== PÁGINA 11: TENSÃO ==========
  addPage();
  addSectionTitle('ANÁLISE DE TENSÃO');

  const totalTension = Math.abs(result.natural_d - result.adapted_d) + 
                      Math.abs(result.natural_i - result.adapted_i) +
                      Math.abs(result.natural_s - result.adapted_s) +
                      Math.abs(result.natural_c - result.adapted_c);

  addSubtitle('Nível de Adaptação Total');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  
  let tensionLevel = 'Baixo';
  let tensionColor = SITE_COLORS.success;
  let tensionDesc = 'Você está trabalhando de forma bastante alinhada com seu perfil natural. Isso é positivo e indica baixo desgaste comportamental.';
  
  if (totalTension > 40) {
    tensionLevel = 'Alto';
    tensionColor = SITE_COLORS.danger;
    tensionDesc = 'Existe uma diferença significativa entre seu perfil natural e adaptado. Isso indica que você está se adaptando consideravelmente ao ambiente, o que pode gerar cansaço se mantido por longos períodos. Considere identificar formas de trabalhar mais próximo ao seu estilo natural.';
  } else if (totalTension > 20) {
    tensionLevel = 'Moderado';
    tensionColor = SITE_COLORS.warning;
    tensionDesc = 'Existe alguma diferença entre seu perfil natural e adaptado. Isso é normal e esperado na maioria dos ambientes profissionais. Procure equilibrar momentos de adaptação com momentos onde pode ser mais autêntico.';
  }

  doc.setTextColor(tensionColor[0], tensionColor[1], tensionColor[2]);
  doc.text(`Tensão Total: ${totalTension} pontos (${tensionLevel})`, margin, yPos);
  yPos += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...SITE_COLORS.textDark);
  addText(tensionDesc);
  yPos += 10;

  addSubtitle('Detalhamento por Fator');
  
  const factors = [
    { name: 'Dominância (D)', nat: result.natural_d, adp: result.adapted_d, color: SITE_COLORS.discD },
    { name: 'Influência (I)', nat: result.natural_i, adp: result.adapted_i, color: SITE_COLORS.discI },
    { name: 'Estabilidade (S)', nat: result.natural_s, adp: result.adapted_s, color: SITE_COLORS.discS },
    { name: 'Conformidade (C)', nat: result.natural_c, adp: result.adapted_c, color: SITE_COLORS.discC }
  ];

  factors.forEach(f => {
    const diff = Math.abs(f.nat - f.adp);
    const direction = f.adp > f.nat ? 'Aumentando' : f.adp < f.nat ? 'Reduzindo' : 'Mantendo';
    checkPageBreak(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(f.color[0], f.color[1], f.color[2]);
    doc.text(`${f.name}: ${direction} ${diff} pontos`, margin + 5, yPos);
    yPos += 8;
  });

  // ========== PÁGINA 12: RESOLUÇÃO DE PROBLEMAS ==========
  addPage();
  addSectionTitle('RESOLUÇÃO DE PROBLEMAS');

  addSubtitle('Como você lida com desafios');
  addText('Com base no seu perfil DISC, aqui estão suas principais características ao enfrentar problemas:');
  yPos += 5;

  const problemSolvingTraits = [];
  
  if (result.natural_d > 25) {
    problemSolvingTraits.push('Enfrenta problemas de forma direta e assertiva');
    problemSolvingTraits.push('Busca soluções rápidas e eficazes');
    problemSolvingTraits.push('Assume riscos calculados para superar obstáculos');
  }
  
  if (result.natural_i > 25) {
    problemSolvingTraits.push('Busca input e colaboração de outras pessoas');
    problemSolvingTraits.push('Usa criatividade para encontrar soluções inovadoras');
    problemSolvingTraits.push('Mantém otimismo mesmo em situações difíceis');
  }
  
  if (result.natural_s > 25) {
    problemSolvingTraits.push('Analisa o problema com calma e paciência');
    problemSolvingTraits.push('Busca soluções que mantenham harmonia no time');
    problemSolvingTraits.push('Prefere abordagens testadas e comprovadas');
  }
  
  if (result.natural_c > 25) {
    problemSolvingTraits.push('Analisa dados e informações antes de agir');
    problemSolvingTraits.push('Segue processos sistemáticos de resolução');
    problemSolvingTraits.push('Busca a melhor solução, não apenas a mais rápida');
  }

  if (problemSolvingTraits.length === 0) {
    problemSolvingTraits.push('Abordagem equilibrada entre diferentes estilos');
    problemSolvingTraits.push('Flexibilidade para adaptar método à situação');
    problemSolvingTraits.push('Considera múltiplas perspectivas');
  }

  problemSolvingTraits.forEach(t => addBulletPoint(t));
  
  yPos += 10;
  addSubtitle('Recomendações para otimizar sua resolução de problemas');
  
  const recommendations = [];
  if (result.natural_d < 15) recommendations.push('Pratique ser mais assertivo ao apresentar suas ideias e soluções');
  if (result.natural_i < 15) recommendations.push('Considere buscar mais input de colegas - colaboração pode trazer novas perspectivas');
  if (result.natural_s < 15) recommendations.push('Adicione mais tempo de análise antes de agir - a paciência pode evitar erros');
  if (result.natural_c < 15) recommendations.push('Dedique mais atenção a detalhes e validação de dados antes de implementar soluções');

  if (recommendations.length > 0) {
    recommendations.forEach(r => addBulletPoint(r));
  } else {
    addText('Seu perfil já demonstra um bom equilíbrio para resolução de problemas. Continue desenvolvendo seus pontos fortes.');
  }

  // ========== PÁGINA 13: PONTOS DE DESENVOLVIMENTO ==========
  addPage();
  addSectionTitle('PONTOS DE DESENVOLVIMENTO');

  addText('Com base no seu perfil, identificamos áreas específicas que podem potencializar ainda mais seu desenvolvimento profissional:');
  yPos += 8;

  const developmentPoints = [];

  if (result.natural_d > 30) {
    developmentPoints.push({ title: 'Desenvolver Paciência', desc: 'Pratique ouvir mais e dar espaço para outros contribuírem antes de tomar decisões.' });
    developmentPoints.push({ title: 'Atenção a Detalhes', desc: 'Reserve tempo para revisar informações importantes antes de agir.' });
  } else if (result.natural_d < 15) {
    developmentPoints.push({ title: 'Desenvolver Assertividade', desc: 'Pratique expressar suas opiniões e necessidades de forma mais direta.' });
    developmentPoints.push({ title: 'Tomar Decisões Rápidas', desc: 'Confie mais em sua intuição em situações que exigem agilidade.' });
  }

  if (result.natural_i > 30) {
    developmentPoints.push({ title: 'Organização e Foco', desc: 'Implemente sistemas de organização para manter foco em tarefas importantes.' });
    developmentPoints.push({ title: 'Gestão de Tempo', desc: 'Estabeleça limites claros para interações sociais durante horário de trabalho.' });
  } else if (result.natural_i < 15) {
    developmentPoints.push({ title: 'Networking', desc: 'Invista em construir relacionamentos profissionais mais amplos.' });
    developmentPoints.push({ title: 'Comunicação Expressiva', desc: 'Pratique expressar emoções e entusiasmo ao comunicar ideias.' });
  }

  if (result.natural_s > 30) {
    developmentPoints.push({ title: 'Adaptação a Mudanças', desc: 'Pratique sair da zona de conforto e abraçar novidades.' });
    developmentPoints.push({ title: 'Dizer Não', desc: 'Aprenda a estabelecer limites saudáveis quando necessário.' });
  } else if (result.natural_s < 15) {
    developmentPoints.push({ title: 'Paciência e Consistência', desc: 'Pratique manter foco em projetos de longo prazo.' });
    developmentPoints.push({ title: 'Escuta Ativa', desc: 'Dedique mais tempo para ouvir profundamente os outros.' });
  }

  if (result.natural_c > 30) {
    developmentPoints.push({ title: 'Flexibilidade', desc: 'Pratique ser mais flexível com regras quando o contexto exige.' });
    developmentPoints.push({ title: 'Tomada de Decisão Ágil', desc: 'Desenvolva confiança para agir com informação suficiente, não perfeita.' });
  } else if (result.natural_c < 15) {
    developmentPoints.push({ title: 'Atenção à Qualidade', desc: 'Implemente checklists para garantir precisão em tarefas importantes.' });
    developmentPoints.push({ title: 'Planejamento', desc: 'Dedique mais tempo ao planejamento antes da execução.' });
  }

  developmentPoints.forEach(point => {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...SITE_COLORS.primary);
    doc.text(point.title, margin + 5, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...SITE_COLORS.textDark);
    addText(point.desc);
    yPos += 5;
  });

  // ========== PÁGINA 14: VALORES MOTIVACIONAIS ==========
  if (result.values_scores) {
    addPage();
    addSectionTitle('VALORES MOTIVACIONAIS');

    addText('A teoria de valores identifica seis dimensões principais que motivam comportamentos e decisões. Seus resultados indicam suas prioridades e o que mais lhe motiva profissionalmente.');
    yPos += 10;

    checkPageBreak(120);
    drawValuesRadar(result.values_scores, margin, yPos, contentWidth);
    yPos += 130;

    addSubtitle('Interpretação dos Valores');
    
    const valueDescriptions: Record<string, string> = {
      theoretical: 'Busca conhecimento, verdade e compreensão intelectual',
      economic: 'Foco em praticidade, eficiência e retorno sobre investimento',
      aesthetic: 'Valoriza beleza, harmonia e experiências sensoriais',
      social: 'Motivado por ajudar outros e contribuir para o bem comum',
      political: 'Busca influência, poder e reconhecimento',
      spiritual: 'Busca significado, propósito e valores transcendentes'
    };

    const sortedValues = Object.entries(result.values_scores)
      .sort(([,a], [,b]) => (b as number) - (a as number));

    sortedValues.forEach(([key, value], i) => {
      checkPageBreak(15);
      const level = (value as number) > 45 ? 'Muito Alto' : (value as number) > 35 ? 'Alto' : (value as number) > 25 ? 'Médio' : 'Baixo';
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...SITE_COLORS.info);
      doc.text(`${i + 1}º - ${key === 'theoretical' ? 'Teórico' : key === 'economic' ? 'Econômico' : key === 'aesthetic' ? 'Estético' : key === 'social' ? 'Social' : key === 'political' ? 'Político' : 'Espiritual'}: ${value}/60 (${level})`, margin + 5, yPos);
      yPos += 7;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...SITE_COLORS.textDark);
      addText(valueDescriptions[key]);
      yPos += 3;
    });
  }

  // ========== PÁGINA 15: TIPOLOGIA DE JUNG ==========
  if (result.jungian_type) {
    addPage();
    addSectionTitle('TIPOLOGIA PSICOLÓGICA DE JUNG');

    addText('Carl Jung desenvolveu uma teoria sobre tipos psicológicos baseados em preferências de como percebemos o mundo e tomamos decisões.');
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...SITE_COLORS.primary);
    doc.text(`Seu tipo: ${result.jungian_type}`, margin, yPos);
    yPos += 15;

    addSubtitle('Significado do Tipo');
    
    const jungianDescriptions: Record<string, string> = {
      'ESTJ': 'Executor prático e organizado. Valoriza eficiência, estrutura e resultados concretos.',
      'ISTJ': 'Inspetor meticuloso e confiável. Foca em detalhes, responsabilidade e tradição.',
      'ENTJ': 'Comandante estratégico e visionário. Lidera com lógica e busca eficiência sistêmica.',
      'INTJ': 'Arquiteto inovador e independente. Pensa estrategicamente e valoriza competência.',
      'ESTP': 'Empreendedor energético e prático. Age rapidamente e resolve problemas no momento.',
      'ISTP': 'Virtuoso técnico e adaptável. Analisa mecanismos e sistemas com precisão.',
      'ENTP': 'Visionário criativo e debatedor. Gera ideias inovadoras e desafia status quo.',
      'INTP': 'Pensador lógico e analítico. Busca entender sistemas complexos e teorias.',
      'ESFJ': 'Cônsul prestativo e organizado. Valoriza harmonia e cuida do bem-estar do grupo.',
      'ISFJ': 'Defensor dedicado e protetor. Leal, detalhista e comprometido com suas responsabilidades.',
      'ENFJ': 'Protagonista carismático e inspirador. Motiva outros e promove crescimento pessoal.',
      'INFJ': 'Advogado idealista e visionário. Busca significado profundo e impacto positivo.',
      'ESFP': 'Animador espontâneo e entusiasta. Traz energia e alegria para o ambiente.',
      'ISFP': 'Aventureiro sensível e artístico. Valoriza autenticidade e experiências estéticas.',
      'ENFP': 'Ativista criativo e entusiasta. Explora possibilidades e inspira mudanças positivas.',
      'INFP': 'Mediador idealista e empático. Guiado por valores profundos e busca por autenticidade.'
    };

    addText(jungianDescriptions[result.jungian_type] || 'Tipo único com características específicas.');
    yPos += 10;

    addSubtitle('Implicações Profissionais');
    addText('Seu tipo psicológico influencia como você prefere trabalhar, comunicar e tomar decisões. Use esse conhecimento para buscar ambientes e funções que permitam expressar suas preferências naturais.');
  }

  // ========== PÁGINA 16: ESTILOS DE LIDERANÇA ==========
  if (result.leadership_style) {
    addPage();
    addSectionTitle('ESTILOS DE LIDERANÇA');

    addText('A análise de liderança identifica seus estilos predominantes ao liderar equipes e projetos.');
    yPos += 10;

    checkPageBreak(100);
    drawLeadershipPie(result.leadership_style, margin, yPos, 40);
    yPos += 100;

    addSubtitle('Descrição dos Estilos');

    const leadershipDesc: Record<string, string> = {
      executive: 'Estilo Executivo: Foca em resultados, toma decisões rápidas e lidera com autoridade. Eficaz em situações que exigem ação imediata e direcionamento claro.',
      motivator: 'Estilo Motivador: Inspira e energiza a equipe. Cria ambiente positivo e estimula criatividade e colaboração.',
      systematic: 'Estilo Sistemático: Estrutura processos e garante consistência. Lidera com planejamento e organização meticulosa.',
      methodical: 'Estilo Metódico: Analisa informações cuidadosamente antes de decidir. Garante qualidade e precisão nas entregas.'
    };

    Object.entries(result.leadership_style).forEach(([key, value]) => {
      checkPageBreak(15);
      const percentage = Math.round(((value as number) / 40) * 100);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...SITE_COLORS.primary);
      doc.text(`${key === 'executive' ? 'Executivo' : key === 'motivator' ? 'Motivador' : key === 'systematic' ? 'Sistemático' : 'Metódico'}: ${percentage}%`, margin + 5, yPos);
      yPos += 7;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...SITE_COLORS.textDark);
      addText(leadershipDesc[key]);
      yPos += 5;
    });
  }

  // ========== PÁGINA 17: COMPETÊNCIAS ==========
  if (result.competencies) {
    addPage();
    addSectionTitle('MAPA DE COMPETÊNCIAS');

    addText('O mapeamento de competências identifica suas principais habilidades e áreas de desenvolvimento.');
    yPos += 10;

    checkPageBreak(120);
    drawCompetenciesBar(result.competencies, margin, yPos, contentWidth, 110);
    yPos += 120;

    addSubtitle('Interpretação');
    addText('Competências acima de 30 pontos indicam pontos fortes. Entre 15-30 são áreas de desenvolvimento. Abaixo de 15 requerem atenção especial se forem relevantes para sua função.');
  }

  // ========== ANÁLISE PARA CONTRATAÇÃO ==========
  addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...SITE_COLORS.primary);
  doc.text('ANÁLISE PARA CONTRATAÇÃO', margin, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SITE_COLORS.textMedium);
  addText('Esta seção fornece insights estratégicos para processos de contratação, mapeando adequação a funções comerciais e potencial de desenvolvimento.');
  yPos += 10;

  // 1. PERFIL BASE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.info);
  doc.text('1. Perfil Base – Descrição dos Quatro Estilos', margin, yPos);
  yPos += 8;

  // Tabela manual
  const tableHeaders = ['Perfil', 'Características', 'Motiva', 'Atenção'];
  const tableData = [
    ['D', PROFILE_BASE_DESCRIPTIONS.D.characteristics, PROFILE_BASE_DESCRIPTIONS.D.motivatingLanguage, PROFILE_BASE_DESCRIPTIONS.D.attentionPoint],
    ['I', PROFILE_BASE_DESCRIPTIONS.I.characteristics, PROFILE_BASE_DESCRIPTIONS.I.motivatingLanguage, PROFILE_BASE_DESCRIPTIONS.I.attentionPoint],
    ['S', PROFILE_BASE_DESCRIPTIONS.S.characteristics, PROFILE_BASE_DESCRIPTIONS.S.motivatingLanguage, PROFILE_BASE_DESCRIPTIONS.S.attentionPoint],
    ['C', PROFILE_BASE_DESCRIPTIONS.C.characteristics, PROFILE_BASE_DESCRIPTIONS.C.motivatingLanguage, PROFILE_BASE_DESCRIPTIONS.C.attentionPoint]
  ];

  const colWidths = [15, 55, 55, 45];
  const rowHeight = 10;
  let tableX = margin;

  // Cabeçalho
  doc.setFillColor(210, 188, 143);
  doc.rect(tableX, yPos, contentWidth, rowHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  colWidths.forEach((width, i) => {
    doc.text(tableHeaders[i], tableX + 2, yPos + 6);
    tableX += width;
  });
  yPos += rowHeight;

  // Linhas de dados
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  tableData.forEach((row, rowIndex) => {
    tableX = margin;
    const fillColor: [number, number, number] = rowIndex % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
    doc.setFillColor(...fillColor);
    doc.rect(tableX, yPos, contentWidth, rowHeight, 'F');
    
    doc.setTextColor(...SITE_COLORS.textDark);
    colWidths.forEach((width, colIndex) => {
      const lines = doc.splitTextToSize(row[colIndex], width - 4);
      doc.text(lines[0], tableX + 2, yPos + 6);
      tableX += width;
    });
    yPos += rowHeight;
  });
  yPos += 10;

  checkPageBreak(80);

  // 2. MAPEAMENTO POR FUNÇÃO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.info);
  doc.text('2. Mapeamento por Função', margin, yPos);
  yPos += 8;

  Object.entries(ROLE_MAPPINGS).forEach(([role, mapping]: [string, any]) => {
    checkPageBreak(25);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...SITE_COLORS.primary);
    doc.text(`• ${role}`, margin + 3, yPos);
    yPos += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SITE_COLORS.textDark);
    doc.text(`Indicados: ${mapping.mostIndicated.join(', ')}`, margin + 8, yPos);
    yPos += 4;
    doc.text(`Adaptação: ${mapping.requiresAdaptation.join(', ')}`, margin + 8, yPos);
    yPos += 4;
    
    doc.setTextColor(...SITE_COLORS.textMedium);
    const devLines = doc.splitTextToSize(mapping.developmentRecommendations, contentWidth - 8);
    devLines.forEach((line: string) => {
      doc.text(line, margin + 8, yPos);
      yPos += 4;
    });
    yPos += 4;
  });

  checkPageBreak(60);

  // 3. INTERPRETAÇÃO ESTRATÉGICA
  const combinedProfile = getCombinedProfile(result.natural_d, result.natural_i, result.natural_s, result.natural_c);
  const interpretation = STRATEGIC_INTERPRETATIONS[combinedProfile] || STRATEGIC_INTERPRETATIONS['DI'];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.info);
  doc.text('3. Interpretação Estratégica deste Candidato', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SITE_COLORS.textDark);
  doc.text(`Perfil identificado: ${combinedProfile}`, margin + 3, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Potencial:', margin + 3, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  addText(interpretation.potential);
  yPos += 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Limites:', margin + 3, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  addText(interpretation.limitations);
  yPos += 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Sugestão:', margin + 3, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  addText(interpretation.hiringRecommendation);
  yPos += 8;

  // 4. MATRIZ DE DECISÃO
  checkPageBreak(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.info);
  doc.text('4. Matriz de Decisão', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  Object.values(DECISION_MATRIX).forEach((item: any) => {
    checkPageBreak(10);
    doc.setTextColor(...SITE_COLORS.textDark);
    doc.text(`• ${item.question}`, margin + 3, yPos);
    yPos += 4;
    doc.setTextColor(...SITE_COLORS.textMedium);
    doc.text(`  ${item.highInterpretation}`, margin + 6, yPos);
    yPos += 5;
  });
  yPos += 5;

  // 5. ESCALA DE EVOLUÇÃO
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.info);
  doc.text('5. Escala de Potencial', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  Object.entries(EVOLUTION_SCALE).forEach(([level, data]: [string, any]) => {
    checkPageBreak(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SITE_COLORS.primary);
    doc.text(`${level}:`, margin + 3, yPos);
    yPos += 4;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SITE_COLORS.textDark);
    doc.text(`${data.description} - ${data.application}`, margin + 6, yPos);
    yPos += 5;
  });
  yPos += 6;

  // 6. CONCLUSÃO
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.info);
  doc.text('6. Conclusão Automática', margin, yPos);
  yPos += 8;

  const conclusion = generateHiringConclusion(
    combinedProfile,
    result.natural_d,
    result.natural_i,
    result.natural_s,
    result.natural_c,
    result.tension_level
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SITE_COLORS.textDark);
  addText(conclusion);
  yPos += 10;

  // ========== PÁGINA 18: COMUNICAÇÃO ==========
  addPage();
  addSectionTitle('SUGESTÕES PARA COMUNICAÇÃO');

  addSubtitle('Como se comunicar melhor com você');
  addText('Com base no seu perfil, aqui estão dicas para quem se comunica com você:');
  yPos += 5;

  const commDos = [];
  const commDonts = [];

  if (result.natural_d > 25) {
    commDos.push('Seja direto e objetivo');
    commDos.push('Foque em resultados e soluções');
    commDonts.push('Evite rodeios ou detalhes excessivos');
    commDonts.push('Não questione constantemente suas decisões');
  } else if (result.natural_d < 15) {
    commDos.push('Seja diplomático e respeitoso');
    commDos.push('Apresente opções e permita reflexão');
    commDonts.push('Evite ser excessivamente assertivo');
    commDonts.push('Não pressione por decisões imediatas');
  }

  if (result.natural_i > 25) {
    commDos.push('Seja entusiasta e positivo');
    commDos.push('Permita espaço para brainstorming');
    commDonts.push('Evite ser excessivamente formal');
    commDonts.push('Não limite interação social');
  } else if (result.natural_i < 15) {
    commDos.push('Seja objetivo e baseado em fatos');
    commDos.push('Respeite necessidade de privacidade');
    commDonts.push('Evite pressionar por networking constante');
    commDonts.push('Não force interações sociais desnecessárias');
  }

  if (result.natural_s > 25) {
    commDos.push('Dê tempo para processar mudanças');
    commDos.push('Reconheça contribuições e lealdade');
    commDonts.push('Evite mudanças abruptas sem aviso');
    commDonts.push('Não crie ambientes de conflito constante');
  } else if (result.natural_s < 15) {
    commDos.push('Apresente novidades e desafios');
    commDos.push('Permita flexibilidade e dinamismo');
    commDonts.push('Evite rotinas excessivamente rígidas');
    commDonts.push('Não limite capacidade de multitarefa');
  }

  if (result.natural_c > 25) {
    commDos.push('Forneça dados e informações detalhadas');
    commDos.push('Respeite necessidade de precisão');
    commDonts.push('Evite decisões sem análise adequada');
    commDonts.push('Não ignore padrões de qualidade');
  } else if (result.natural_c < 15) {
    commDos.push('Foque no panorama geral');
    commDos.push('Permita flexibilidade com processos');
    commDonts.push('Evite excesso de detalhes técnicos');
    commDonts.push('Não exija precisão excessiva em tudo');
  }

  addSubtitle('FAÇA:');
  commDos.forEach(d => addBulletPoint(d));
  yPos += 5;

  addSubtitle('EVITE:');
  commDonts.forEach(d => addBulletPoint(d));

  // ========== PÁGINA 19: PLANO DE AÇÃO ==========
  addPage();
  addSectionTitle('PLANO DE AÇÃO PERSONALIZADO');

  addSubtitle('Próximos Passos para Desenvolvimento');
  addText('Com base em toda a análise do seu perfil, recomendamos as seguintes ações práticas:');
  yPos += 8;

  const actionPlan = [
    {
      title: '1. Autoconhecimento Contínuo',
      action: 'Revise este relatório trimestralmente e observe como você está aplicando os insights no dia a dia. Mantenha um diário de reflexões sobre situações onde seu perfil se manifestou.'
    },
    {
      title: '2. Desenvolvimento Focado',
      action: `Escolha 2-3 pontos de desenvolvimento identificados neste relatório e crie um plano de 90 dias para trabalhar cada um. ${result.natural_d < 15 ? 'Foco especial em desenvolver assertividade.' : result.natural_i < 15 ? 'Foco especial em habilidades de comunicação.' : result.natural_s < 15 ? 'Foco especial em paciência e consistência.' : 'Foco especial em flexibilidade.'}`
    },
    {
      title: '3. Aproveite Seus Pontos Fortes',
      action: 'Busque oportunidades e projetos que permitam usar suas competências mais fortes. Isso aumentará sua satisfação e efetividade profissional.'
    },
    {
      title: '4. Gestão de Energia',
      action: totalTension > 30 ? 'Como você está se adaptando significativamente ao ambiente, reserve momentos do dia para atividades que permitam expressar seu estilo natural. Isso reduzirá cansaço.' : 'Continue equilibrando adaptação com autenticidade para manter energia sustentável.'
    },
    {
      title: '5. Comunicação Efetiva',
      action: 'Compartilhe os insights deste relatório com gestores e colegas próximos. Isso facilitará comunicação mais efetiva e colaboração produtiva.'
    }
  ];

  actionPlan.forEach(item => {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...SITE_COLORS.primary);
    doc.text(item.title, margin, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...SITE_COLORS.textDark);
    addText(item.action);
    yPos += 8;
  });

  // ========== PÁGINA 20: CONSIDERAÇÕES FINAIS ==========
  addPage();
  addSectionTitle('CONSIDERAÇÕES FINAIS');

  addText('Este relatório representa uma análise abrangente do seu perfil comportamental, motivacional e de competências. Lembre-se de que:');
  yPos += 5;

  const finalPoints = [
    'Este relatório é uma ferramenta de autoconhecimento, não uma limitação. Você pode desenvolver qualquer competência com prática e dedicação.',
    'Não existe perfil "melhor" ou "pior" - cada estilo tem seus pontos fortes únicos e contribuições valiosas.',
    'O ambiente e o contexto influenciam comportamento. É natural adaptar-se, mas importante manter equilíbrio.',
    'Use este relatório como ponto de partida para conversas com mentores, gestores e coaches sobre seu desenvolvimento.',
    'Revise seus resultados periodicamente - autoconhecimento é uma jornada contínua, não um destino.'
  ];

  finalPoints.forEach(p => addBulletPoint(p));

  yPos += 10;
  addSubtitle('Próximos Passos Recomendados');

  const nextSteps = [
    'Agende uma conversa com seu gestor para discutir os insights deste relatório',
    'Identifique um mentor ou coach para apoiar seu desenvolvimento',
    'Crie metas específicas de desenvolvimento para os próximos 3-6 meses',
    'Busque feedback de colegas sobre como percebem seus pontos fortes e áreas de melhoria',
    'Considere fazer uma nova avaliação em 12 meses para acompanhar sua evolução'
  ];

  nextSteps.forEach(s => addBulletPoint(s));

  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.primary);
  const finalText = 'Obrigado por completar o DISC da Conversão. Desejamos sucesso em sua jornada de desenvolvimento!';
  const finalLines = wrapText(finalText, contentWidth);
  finalLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
  });

  addFooter();

  // Generate PDF
  const pdfData = doc.output('arraybuffer');
  return new Uint8Array(pdfData);
}
