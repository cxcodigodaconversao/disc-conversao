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

    // Fetch assessment data with campaign target_role
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select(`*, campaigns (name, description, target_role)`)
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

    console.log('Generating PDF with jsPDF primitives...');

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
    mostIndicated: ['DC', 'CD', 'D', 'C'],
    requiresAdaptation: ['DI', 'ID', 'I', 'S', 'SC', 'CS', 'IS', 'SI'],
    developmentRecommendations: 'Treinar disciplina em CRM, follow-up estruturado e conformidade com processos. SDR requer D alto (assertividade) + C alto (disciplina operacional).'
  },
  'Closer': {
    mostIndicated: ['DI', 'ID', 'D', 'DC', 'I'],
    requiresAdaptation: ['CD', 'S', 'IS', 'SI', 'SC', 'CS', 'C'],
    developmentRecommendations: 'Desenvolver escuta ativa e leitura de perfil; treinar assertividade e técnica de fechamento estruturado. Perfis ID/DI são naturalmente fortes em rapport e fechamento.'
  },
  'Suporte/Atendimento': {
    mostIndicated: ['S', 'SC', 'IS', 'CS', 'C'],
    requiresAdaptation: ['D', 'DI', 'ID', 'I'],
    developmentRecommendations: 'Praticar empatia e paciência; criar checklists e rotinas de atendimento consistentes.'
  },
  'Gestor Comercial': {
    mostIndicated: ['D', 'DC', 'DI', 'DS'],
    requiresAdaptation: ['ID', 'I', 'C', 'IS'],
    developmentRecommendations: 'Treinar liderança situacional, equilibrando pressão por resultados com empatia pela equipe.'
  },
  'Head/Estratégico': {
    mostIndicated: ['DC', 'D', 'CD', 'C'],
    requiresAdaptation: ['DI', 'I', 'ID', 'IS', 'S'],
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

// Mapeamento de adequação de perfis para funções (0-100%)
const ROLE_FIT_MATRIX: Record<string, Record<string, { fit: number; reason: string }>> = {
  'SDR': {
    'DC': { fit: 95, reason: 'Perfil ideal: combina assertividade (D) com disciplina em processos (C), essencial para prospecção estruturada.' },
    'CD': { fit: 90, reason: 'Excelente em follow-up disciplinado. Alta atenção a processos e consistência.' },
    'D': { fit: 75, reason: 'Forte em persistência, mas precisa desenvolver disciplina em CRM e scripts.' },
    'C': { fit: 70, reason: 'Metódico e estruturado, mas precisa desenvolver assertividade para lidar com rejeição.' },
    'DI': { fit: 70, reason: 'Assertivo e comunicativo, mas pode faltar conformidade com processos. Requer treinamento em sistemas.' },
    'ID': { fit: 65, reason: 'Excelente em networking inicial, mas precisa desenvolver disciplina operacional e follow-up estruturado.' },
    'I': { fit: 60, reason: 'Natural em comunicação, mas falta estrutura e disciplina em follow-ups.' },
    'IS': { fit: 55, reason: 'Boa comunicação, mas pode ter dificuldade com rejeição e necessita de scripts claros.' },
    'DS': { fit: 55, reason: 'Pode atuar em SDR consultivo de ciclo médio, mas requer treinamento em soft skills.' },
    'SC': { fit: 50, reason: 'Alta conformidade mas baixa assertividade. Pode funcionar em inbound estruturado.' },
    'CS': { fit: 45, reason: 'Combina introversão com evitação de conflitos. Melhor em suporte ou análise.' },
    'S': { fit: 30, reason: 'Evita confronto e pressão. Não é indicado para SDR sem desenvolvimento significativo.' }
  },
  'Closer': {
    'DI': { fit: 95, reason: 'Perfil ideal: combina assertividade para fechar com carisma para construir rapport. Excelente em vendas consultivas.' },
    'ID': { fit: 90, reason: 'Influência social alta + foco em resultado. Perfeito para vendas relacionais e Social Selling.' },
    'D': { fit: 88, reason: 'Foco extremo em resultados, habilidade de fechar negócios e superar objeções.' },
    'DC': { fit: 85, reason: 'Assertivo com análise. Excelente para vendas complexas B2B de alto ticket.' },
    'I': { fit: 70, reason: 'Forte em rapport, mas pode hesitar no fechamento. Precisa desenvolver assertividade.' },
    'IS': { fit: 55, reason: 'Pode fechar vendas relacionais, mas evita pressão e objeções diretas.' },
    'CD': { fit: 65, reason: 'Bom para vendas técnicas de alto valor. Precisa ganhar confiança em negociação.' },
    'SC': { fit: 40, reason: 'Evita confronto e pressão. Não recomendado para closer sem 6+ meses de desenvolvimento.' },
    'S': { fit: 35, reason: 'Perfil muito relacional e evita fechamento direto. Melhor em CS ou suporte.' },
    'C': { fit: 45, reason: 'Foco em dados pode dificultar decisão emocional do fechamento. Vendas técnicas apenas.' },
    'CS': { fit: 38, reason: 'Perfil passivo e analítico. Não indicado para closer.' },
    'DS': { fit: 70, reason: 'Pode fechar vendas consultivas, mas prefere ciclos longos e relacionamentos estáveis.' }
  },
  'Head Comercial': {
    'D': { fit: 90, reason: 'Liderança natural, foco em metas e capacidade de tomar decisões estratégicas rápidas.' },
    'DC': { fit: 95, reason: 'Perfil ideal: visão estratégica, orientação a dados e execução disciplinada.' },
    'DI': { fit: 85, reason: 'Combina liderança com carisma. Ótimo para motivar times, mas pode precisar de estrutura.' },
    'CD': { fit: 80, reason: 'Excelente em processos e métricas. Pode precisar desenvolver habilidades de influência.' },
    'I': { fit: 60, reason: 'Carisma e motivação, mas pode faltar disciplina estratégica e foco em números.' },
    'ID': { fit: 65, reason: 'Bom para liderança inspiracional, mas precisa de apoio em processos e análise.' },
    'IS': { fit: 50, reason: 'Perfil muito empático e relacional para a pressão de gestão comercial.' },
    'SC': { fit: 45, reason: 'Falta assertividade e capacidade de decisão rápida. Melhor como analista.' },
    'S': { fit: 40, reason: 'Evita conflito e mudanças. Não indicado para liderança comercial.' },
    'C': { fit: 55, reason: 'Excelente em análise, mas pode ser indeciso e lento para liderar equipe de vendas.' },
    'CS': { fit: 48, reason: 'Perfil muito técnico e passivo para gestão comercial.' },
    'DS': { fit: 70, reason: 'Pode liderar com foco em metas de longo prazo, mas precisa de urgência.' }
  },
  'Customer Success': {
    'S': { fit: 95, reason: 'Perfil ideal: estabilidade, paciência e foco em relacionamentos de longo prazo.' },
    'SC': { fit: 90, reason: 'Combina empatia com atenção aos detalhes. Excelente para suporte técnico humanizado.' },
    'IS': { fit: 88, reason: 'Ótimo relacionamento interpessoal com consistência. Ideal para CS.' },
    'CS': { fit: 85, reason: 'Metódico e empático. Cria processos de suporte eficientes e humanizados.' },
    'I': { fit: 70, reason: 'Excelente em engajamento, mas pode faltar follow-up e disciplina operacional.' },
    'C': { fit: 65, reason: 'Ótimo em suporte técnico, mas pode ser pouco empático e relacional.' },
    'ID': { fit: 75, reason: 'Equilibra relacionamento com foco em resultado. Bom para upsell/cross-sell.' },
    'DS': { fit: 60, reason: 'Pode atuar em CS consultivo, mas precisa desenvolver paciência e empatia.' },
    'D': { fit: 45, reason: 'Falta paciência para atendimento de longo prazo. Melhor em vendas.' },
    'DI': { fit: 55, reason: 'Pode atuar em CS estratégico/upsell, mas não em suporte operacional.' },
    'DC': { fit: 50, reason: 'Muito direto e focado em processos para atendimento humanizado.' },
    'CD': { fit: 70, reason: 'Bom para suporte técnico estruturado, mas precisa desenvolver soft skills.' }
  },
  'Analista de Processos': {
    'C': { fit: 95, reason: 'Perfil ideal: atenção extrema aos detalhes, foco em qualidade e análise profunda.' },
    'CD': { fit: 90, reason: 'Combina análise com execução. Excelente para implementação de processos.' },
    'CS': { fit: 88, reason: 'Metódico com empatia. Cria processos humanizados e sustentáveis.' },
    'SC': { fit: 85, reason: 'Disciplina e consistência. Ótimo para documentação e controle de qualidade.' },
    'DC': { fit: 80, reason: 'Foco em dados e resultados. Pode implementar processos de alta performance.' },
    'S': { fit: 65, reason: 'Consistente, mas pode faltar análise crítica e inovação em processos.' },
    'D': { fit: 40, reason: 'Falta paciência para análise detalhada. Prefere execução rápida.' },
    'I': { fit: 35, reason: 'Disperso e pouco estruturado para análise de processos.' },
    'DI': { fit: 45, reason: 'Foco em resultado pode atropelar análise detalhada necessária.' },
    'ID': { fit: 50, reason: 'Pode trazer criatividade, mas falta disciplina analítica.' },
    'IS': { fit: 60, reason: 'Pode criar processos relacionais, mas precisa desenvolver rigor técnico.' },
    'DS': { fit: 55, reason: 'Pode mapear processos, mas precisa de paciência para análise profunda.' }
  }
};

const suggestAlternativeRoles = (
  combinedProfile: string,
  targetRole?: string
): Array<{ role: string; fit: number; reason: string; development?: string }> => {
  const allRoles = Object.keys(ROLE_FIT_MATRIX);
  
  const recommendations = allRoles
    .map(role => {
      const fitData = ROLE_FIT_MATRIX[role][combinedProfile] || { fit: 50, reason: 'Adequação não mapeada para este perfil.' };
      return {
        role,
        fit: fitData.fit,
        reason: fitData.reason,
        development: fitData.fit < 60 ? 'Requer 3-6 meses de desenvolvimento' : fitData.fit < 75 ? 'Requer 1-3 meses de onboarding' : undefined
      };
    })
    .sort((a, b) => b.fit - a.fit);
  
  if (targetRole) {
    const targetFit = ROLE_FIT_MATRIX[targetRole]?.[combinedProfile]?.fit || 50;
    if (targetFit < 70) {
      return recommendations.filter(r => r.role !== targetRole).slice(0, 3);
    }
  }
  
  return recommendations.slice(0, 3);
};

const generateHiringConclusion = (
  combinedProfile: string,
  naturalD: number,
  naturalI: number,
  naturalS: number,
  naturalC: number,
  tensionLevel: string,
  targetRole?: string
): string => {
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
  
  let idealRole = 'Closer';
  if (['D', 'DC', 'CD'].includes(combinedProfile)) {
    idealRole = naturalD > 30 && naturalC > 20 ? 'Head Comercial' : 'Gestor Comercial';
  } else if (['DI', 'ID'].includes(combinedProfile)) {
    idealRole = 'Closer'; // ID/DI são melhores como Closer, não SDR
  } else if (['I'].includes(combinedProfile)) {
    idealRole = 'Social Selling';
  } else if (['DC', 'CD', 'C'].includes(combinedProfile)) {
    idealRole = 'SDR'; // Perfis com C alto são melhores para SDR
  } else if (['S', 'SC', 'CS', 'IS'].includes(combinedProfile)) {
    idealRole = 'Customer Success';
  }
  
  const canStartNow = tensionLevel === 'low' ? 'Sim' : tensionLevel === 'moderate' ? 'Sim, com ressalvas' : 'Requer avaliação detalhada';
  
  let devTime = 'Imediato';
  if (tensionLevel === 'high') {
    devTime = '90 dias com acompanhamento próximo';
  } else if (tensionLevel === 'moderate') {
    devTime = '30 dias com onboarding estruturado';
  }
  
  let supportType = 'Autonomia com check-ins semanais';
  if (naturalD < 15 && naturalI < 15) {
    supportType = 'Mentoria próxima com scripts e processos claros';
  } else if (naturalD > 30 && naturalC < 15) {
    supportType = 'Supervisão para garantir seguimento de processos';
  } else if (tensionLevel === 'high') {
    supportType = 'Acompanhamento diário nas primeiras 4 semanas';
  }
  
  const tensionText = tensionLevel === 'high' 
    ? 'ALTA - Ambiente exige adaptação significativa. Risco de burnout se não houver suporte adequado. Monitorar bem-estar semanalmente.' 
    : tensionLevel === 'moderate'
    ? 'MODERADA - Adaptação controlada. Candidato está ajustando comportamento de forma sustentável.'
    : 'BAIXA - Excelente alinhamento entre perfil natural e demandas da função. Candidato pode performar com autenticidade.';
  
  let plan90Days = '';
  if (naturalD > 25) {
    plan90Days = 'Semanas 1-4: Imersão em processos e cultura. | Semanas 5-8: Assumir primeiras metas individuais. | Semanas 9-12: Avaliar performance e ajustar estilo de liderança.';
  } else if (naturalI > 25) {
    plan90Days = 'Semanas 1-4: Treinamento em técnicas de comunicação e scripts. | Semanas 5-8: Praticar abordagem com supervisão. | Semanas 9-12: Atuar com autonomia e medir conversão.';
  } else if (naturalS > 25) {
    plan90Days = 'Semanas 1-4: Conhecer processos e ferramentas. | Semanas 5-8: Desenvolver consistência no atendimento. | Semanas 9-12: Buscar feedback e identificar melhorias contínuas.';
  } else if (naturalC > 25) {
    plan90Days = 'Semanas 1-4: Dominar sistemas e métricas. | Semanas 5-8: Praticar decisão rápida com dados. | Semanas 9-12: Aumentar velocidade mantendo qualidade.';
  } else {
    plan90Days = 'Semanas 1-4: Imersão na cultura e expectativas. | Semanas 5-8: Desenvolver competências-chave identificadas. | Semanas 9-12: Avaliação de fit e ajustes.';
  }
  
  let targetRoleFit = '';
  let alternativeRolesText = '';
  
  if (targetRole && ROLE_FIT_MATRIX[targetRole]) {
    const fitData = ROLE_FIT_MATRIX[targetRole][combinedProfile] || { fit: 50, reason: 'Adequação não avaliada.' };
    const isAdequate = fitData.fit >= 70;
    
    targetRoleFit = `\n\nAVALIAÇÃO PARA A VAGA: ${targetRole}
STATUS: ${isAdequate ? '✅ RECOMENDADO' : '⚠️ NÃO RECOMENDADO'} (Adequação: ${fitData.fit}%)
JUSTIFICATIVA: ${fitData.reason}`;
    
    if (!isAdequate) {
      const alternatives = suggestAlternativeRoles(combinedProfile, targetRole);
      alternativeRolesText = `\n\nFUNÇÕES ALTERNATIVAS RECOMENDADAS:\n\n${alternatives.map((alt, idx) => {
        const emoji = idx === 0 ? '✅' : idx === 1 ? '✅' : '⚠️';
        return `${emoji} ${idx + 1}ª OPÇÃO: ${alt.role}
   ADEQUAÇÃO: ${alt.fit >= 85 ? 'ALTA' : alt.fit >= 70 ? 'MÉDIA-ALTA' : 'MÉDIA'} (${alt.fit}%)
   JUSTIFICATIVA: ${alt.reason}${alt.development ? `\n   DESENVOLVIMENTO: ${alt.development}` : ''}`;
      }).join('\n\n')}`;
    }
  }
  
  return `O perfil identificado é ${combinedProfile}, com energia voltada a ${dominantTraits}.${targetRoleFit}

RECOMENDAÇÃO PARA CONTRATAÇÃO:
• CARGO IDEAL: ${idealRole}
• PODE ASSUMIR HOJE: ${canStartNow}
• TEMPO DE DESENVOLVIMENTO ESTIMADO: ${devTime}
• TIPO DE SUPORTE NECESSÁRIO: ${supportType}

NÍVEL DE TENSÃO: ${tensionText}

PLANO DE 90 DIAS:
${plan90Days}${alternativeRolesText}

CONCLUSÃO: ${interpretation.hiringRecommendation}`;
};

const generatePDFDocument = async (assessment: any, result: any): Promise<Uint8Array> => {
  // Inicializar documento PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Cores do site
  const SITE_COLORS = {
    primary: [91, 192, 222] as [number, number, number],
    secondary: [92, 184, 92] as [number, number, number],
    info: [91, 192, 222] as [number, number, number],
    success: [92, 184, 92] as [number, number, number],
    warning: [240, 173, 78] as [number, number, number],
    danger: [217, 83, 79] as [number, number, number],
    textDark: [51, 51, 51] as [number, number, number],
    textMedium: [102, 102, 102] as [number, number, number],
    textMuted: [153, 153, 153] as [number, number, number],
    discD: [217, 83, 79] as [number, number, number],
    discI: [240, 173, 78] as [number, number, number],
    discS: [92, 184, 92] as [number, number, number],
    discC: [91, 192, 222] as [number, number, number]
  };

  // Variáveis de layout
  const margin = 20;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;
  let pageNumber = 1;

  // Função para quebrar texto em linhas
  const wrapText = (text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const lineWidth = doc.getTextWidth(testLine);
      
      if (lineWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  // Funções de cabeçalho e rodapé
  const addHeader = () => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, 15, pageWidth - margin, 15);
  };

  const addFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SITE_COLORS.textMuted);
    doc.text(`Página ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('DISC da CONVERSÃO - Relatório Confidencial', margin, pageHeight - 10);
  };

  // Função para adicionar nova página
  const addPage = () => {
    const currentFont = doc.getFont();
    const currentFontSize = doc.getFontSize();
    
    doc.addPage();
    pageNumber++;
    yPos = margin;
    
    // Restaurar estado da fonte
    doc.setFont(currentFont.fontName, currentFont.fontStyle);
    doc.setFontSize(currentFontSize);
    
    addHeader();
    addFooter();
  };

  // Função para verificar quebra de página
  const checkPageBreak = (spaceNeeded: number) => {
    if (yPos + spaceNeeded > pageHeight - 25) {
      addPage();
    }
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

  // Mapeamento de competências para português
  const COMPETENCY_TRANSLATIONS: Record<string, string> = {
    'COMMAND': 'Comando',
    'BOLDNESS': 'Ousadia',
    'DETAIL': 'Atenção aos Detalhes',
    'PRUDENCE': 'Prudência',
    'EMPATHY': 'Empatia',
    'PATIENCE': 'Paciência',
    'PLANNING': 'Planejamento',
    'ENTHUSIASM': 'Entusiasmo'
  };

  const drawCompetenciesBar = (competenciesObj: any, x: number, y: number, width: number, height: number) => {
    const entries = Object.entries(competenciesObj)
      .filter(([key]) => key.endsWith('_n'))
      .slice(0, 8)
      .map(([key, value]) => {
        const keyName = key.replace(/_n$/, '').replace(/_/g, ' ').toUpperCase();
        return {
          name: COMPETENCY_TRANSLATIONS[keyName] || keyName,
          value: value as number
        };
      })
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
    doc.line(margin, yPos + 3, margin + (contentWidth * 0.4), yPos + 3);
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
    
    // Primeiro dividir por quebras de linha
    const paragraphs = text.split('\n');
    
    paragraphs.forEach((paragraph: string) => {
      if (paragraph.trim() === '') {
        // Linha vazia = espaçamento
        yPos += 4;
        return;
      }
      
      // Aplicar wrap em cada parágrafo
      const lines = wrapText(paragraph, contentWidth);
      lines.forEach((line: string) => {
        checkPageBreak(8);
        doc.text(line, margin, yPos);
        yPos += 6;
      });
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
  
  checkPageBreak(130);
  drawDISCChart(naturalValues, adaptedValues, margin, yPos, contentWidth, 100);
  yPos += 110;
  
  // Adicionar legenda para o gráfico DISC
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SITE_COLORS.textMuted);
  doc.text('Alto (>30): Característica dominante | Médio (15-30): Característica moderada | Baixo (<15): Característica menos presente', margin, yPos);
  yPos += 10;

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

    checkPageBreak(140);
    drawValuesRadar(result.values_scores, margin, yPos, contentWidth);
    yPos += 130;
    
    // Adicionar legenda para o gráfico de valores
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SITE_COLORS.textMuted);
    doc.text('Escala: 0-60 | Alto (>45) | Médio (25-45) | Baixo (<25)', margin, yPos);
    yPos += 10;

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

    checkPageBreak(110);
    drawLeadershipPie(result.leadership_style, margin, yPos, 40);
    yPos += 100;
    
    // Adicionar nota sobre o gráfico
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SITE_COLORS.textMuted);
    doc.text('Os percentuais mostram a distribuição dos seus estilos de liderança predominantes', margin, yPos);
    yPos += 10;

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
    yPos += 8;
    
    // Explicação das competências
    addSubtitle('Dimensões Avaliadas:');
    yPos += 3;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SITE_COLORS.textDark);
    
    const competencyExplanations = [
      '• Comando: Capacidade de liderar e tomar decisões',
      '• Ousadia: Disposição para assumir riscos calculados',
      '• Atenção aos Detalhes: Precisão e cuidado com minúcias',
      '• Prudência: Cautela e planejamento antes de agir',
      '• Empatia: Sensibilidade às necessidades dos outros',
      '• Paciência: Tolerância a processos longos e repetitivos',
      '• Planejamento: Organização e estruturação de tarefas',
      '• Entusiasmo: Energia e motivação para engajar outros'
    ];
    
    competencyExplanations.forEach(exp => {
      checkPageBreak(5);
      doc.text(exp, margin + 3, yPos);
      yPos += 5;
    });
    
    yPos += 5;

    checkPageBreak(130);
    drawCompetenciesBar(result.competencies, margin, yPos, contentWidth, 110);
    yPos += 120;
    
    // Adicionar legenda para o gráfico de competências
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SITE_COLORS.textMuted);
    doc.text('Alto (>30): Ponto forte | Médio (15-30): Desenvolvimento | Baixo (<15): Atenção especial', margin, yPos);
    yPos += 10;
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
    yPos += 5;
    
    doc.setFontSize(8);
    doc.setTextColor(...SITE_COLORS.textMedium);
    addText(mapping.developmentRecommendations);
    yPos += 6;
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
  doc.setFontSize(10);
  doc.setTextColor(...SITE_COLORS.primary);
  doc.text('Potencial:', margin + 3, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SITE_COLORS.textDark);
  addText(interpretation.potential);
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SITE_COLORS.warning);
  doc.text('Limitações:', margin + 3, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SITE_COLORS.textDark);
  addText(interpretation.limitations);
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SITE_COLORS.success);
  doc.text('Recomendação:', margin + 3, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SITE_COLORS.textDark);
  addText(interpretation.hiringRecommendation);
  yPos += 10;

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

  const targetRole = (assessment as any).campaigns?.target_role;
  const conclusion = generateHiringConclusion(
    combinedProfile,
    result.natural_d,
    result.natural_i,
    result.natural_s,
    result.natural_c,
    result.tension_level,
    targetRole
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SITE_COLORS.textDark);
  addText(conclusion);
  yPos += 10;
  
  // Calcular highlyCompatible antes para uso no resumo
  let highlyCompatible: string[] = [];
  if (['D', 'DC', 'CD'].includes(combinedProfile)) {
    highlyCompatible = ['Closer', 'Gestor Comercial', 'Head Comercial'];
  } else if (['DI', 'ID'].includes(combinedProfile)) {
    highlyCompatible = ['Closer', 'Social Selling', 'Account Executive'];
  } else if (['I'].includes(combinedProfile)) {
    highlyCompatible = ['Social Selling', 'Closer (com treinamento)', 'Marketing'];
  } else if (['S', 'IS', 'SI'].includes(combinedProfile)) {
    highlyCompatible = ['Customer Success', 'Suporte', 'Inside Sales'];
  } else if (['C', 'SC', 'CS'].includes(combinedProfile)) {
    highlyCompatible = ['Analista de Processos', 'Operações', 'Suporte Técnico'];
  }
  
  // ========== RESUMO EXECUTIVO PARA CONTRATAÇÃO ==========
  checkPageBreak(180);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...SITE_COLORS.primary);
  doc.text('RESUMO EXECUTIVO PARA CONTRATAÇÃO', margin, yPos);
  yPos += 12;

  // Box de destaque
  const boxStartY = yPos;
  doc.setDrawColor(...SITE_COLORS.primary);
  doc.setFillColor(250, 250, 250);
  doc.setLineWidth(1);
  doc.roundedRect(margin, yPos, contentWidth, 70, 3, 3, 'FD');
  yPos += 8;

  // PERFIL IDENTIFICADO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.textDark);
  doc.text(`Perfil DISC Identificado: ${combinedProfile}`, margin + 5, yPos);
  yPos += 10;

  // ADEQUAÇÃO PARA CARGO ALVO
  if (targetRole) {
    const targetFit = ROLE_FIT_MATRIX[targetRole]?.[combinedProfile]?.fit || 50;
    const fitColor = targetFit >= 75 ? SITE_COLORS.success : targetFit >= 60 ? SITE_COLORS.warning : SITE_COLORS.danger;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...fitColor);
    doc.text(`Adequação para ${targetRole}: ${targetFit}%`, margin + 5, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SITE_COLORS.textDark);
    const fitReason = ROLE_FIT_MATRIX[targetRole]?.[combinedProfile]?.reason || '';
    const reasonLines = doc.splitTextToSize(fitReason, contentWidth - 15);
    reasonLines.forEach((line: string) => {
      doc.text(line, margin + 5, yPos);
      yPos += 4;
    });
    yPos += 5;
  }

  // Recomendação visual
  let recommendation = '';
  let recommendColor = SITE_COLORS.textDark;
  
  if (targetRole) {
    const targetFit = ROLE_FIT_MATRIX[targetRole]?.[combinedProfile]?.fit || 50;
    if (targetFit >= 75) {
      recommendation = `RECOMENDADO para ${targetRole}`;
      recommendColor = SITE_COLORS.success;
    } else if (targetFit >= 60) {
      recommendation = `RECOMENDADO COM DESENVOLVIMENTO para ${targetRole}`;
      recommendColor = SITE_COLORS.warning;
    } else {
      recommendation = `CONSIDERAR OUTRAS FUNÇÕES - Adequação parcial para ${targetRole}`;
      recommendColor = SITE_COLORS.danger;
    }
  } else {
    recommendation = `Funções mais compatíveis: ${highlyCompatible.slice(0, 2).join(', ')}`;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...recommendColor);
  const recLines = doc.splitTextToSize(recommendation, contentWidth - 15);
  recLines.forEach((line: string) => {
    doc.text(line, margin + 5, yPos);
    yPos += 5;
  });

  yPos = boxStartY + 75;

  // PONTOS FORTES
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.success);
  doc.text('[+] PONTOS FORTES PARA O CARGO', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SITE_COLORS.textDark);

  const strengths: string[] = [];
  if (result.natural_d > 25) strengths.push('Alta assertividade e foco em resultados');
  if (result.natural_i > 25) strengths.push('Excelente comunicação e habilidade de networking');
  if (result.natural_s > 25) strengths.push('Consistência, confiabilidade e trabalho em equipe');
  if (result.natural_c > 25) strengths.push('Atenção a detalhes e disciplina em processos');
  if (result.tension_level === 'low') strengths.push('Baixo desgaste comportamental - trabalha naturalmente');

  strengths.slice(0, 3).forEach(s => {
    doc.text(`• ${s}`, margin + 5, yPos);
    yPos += 6;
  });

  // PONTOS DE ATENÇÃO
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.warning);
  doc.text('[!] PONTOS DE ATENÇÃO CRÍTICOS', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SITE_COLORS.textDark);

  const attentions: string[] = [];
  if (result.natural_d < 15) attentions.push('Pode ter dificuldade com decisões sob pressão');
  if (result.natural_i < 15) attentions.push('Desconforto em networking e apresentações públicas');
  if (result.natural_s < 15) attentions.push('Impaciência com processos longos e rotinas');
  if (result.natural_c < 15) attentions.push('Necessita desenvolver atenção a detalhes e conformidade');
  if (result.tension_level === 'high') attentions.push('Alto desgaste - perfil natural muito diferente do adaptado');

  attentions.slice(0, 3).forEach(a => {
    doc.text(`• ${a}`, margin + 5, yPos);
    yPos += 6;
  });

  yPos += 12;
  
  // ========== ADEQUAÇÃO DO PERFIL ÀS FUNÇÕES COMERCIAIS ==========
  checkPageBreak(100);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...SITE_COLORS.primary);
  doc.text('ADEQUAÇÃO DO PERFIL ÀS FUNÇÕES COMERCIAIS', margin, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SITE_COLORS.textMedium);
  addText(`Baseado no perfil ${combinedProfile} identificado:`);
  yPos += 10;
  
  // Funções altamente compatíveis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(92, 184, 92); // Verde
  doc.text('[+] FUNÇÕES ALTAMENTE COMPATÍVEIS', margin + 3, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SITE_COLORS.textDark);
  
  // highlyCompatible já foi calculado anteriormente
  
  highlyCompatible.forEach(func => {
    doc.text(`• ${func}`, margin + 8, yPos);
    yPos += 6;
  });
  yPos += 5;
  
  // Funções que requerem acompanhamento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(240, 173, 78); // Laranja
  doc.text('[!] FUNÇÕES QUE REQUEREM ACOMPANHAMENTO', margin + 3, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SITE_COLORS.textDark);
  
  let requiresSupport: string[] = [];
  if (['D', 'DC', 'CD'].includes(combinedProfile)) {
    requiresSupport = ['Suporte (baixa empatia natural)', 'Funções operacionais repetitivas'];
  } else if (['DI', 'ID'].includes(combinedProfile)) {
    requiresSupport = ['SDR (falta disciplina em processos)', 'Análise e planejamento'];
  } else if (['I'].includes(combinedProfile)) {
    requiresSupport = ['SDR (dispersão e falta de foco)', 'Gestão de processos'];
  } else if (['S', 'IS', 'SI'].includes(combinedProfile)) {
    requiresSupport = ['SDR (pressão e rejeição)', 'Liderança comercial'];
  } else if (['C', 'SC', 'CS'].includes(combinedProfile)) {
    requiresSupport = ['Closer (hesitação no fechamento)', 'Liderança comercial'];
  }
  
  requiresSupport.forEach(func => {
    doc.text(`• ${func}`, margin + 8, yPos);
    yPos += 6;
  });
  yPos += 5;
  
  // Funções não recomendadas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(217, 83, 79); // Vermelho
  doc.text('[-] NÃO RECOMENDADO (sem desenvolvimento prévio)', margin + 3, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SITE_COLORS.textDark);
  
  let notRecommended: string[] = [];
  if (['D', 'DC', 'CD'].includes(combinedProfile)) {
    notRecommended = ['Atendimento ao cliente de longo prazo'];
  } else if (['I'].includes(combinedProfile)) {
    notRecommended = ['Controle de qualidade', 'Análise de dados'];
  } else if (['S'].includes(combinedProfile)) {
    notRecommended = ['Prospecção agressiva'];
  } else if (['C'].includes(combinedProfile)) {
    notRecommended = ['Vendas de improviso'];
  }
  
  if (notRecommended.length > 0) {
    notRecommended.forEach(func => {
      doc.text(`• ${func}`, margin + 8, yPos);
      yPos += 6;
    });
  } else {
    doc.text('• Nenhuma restrição significativa identificada', margin + 8, yPos);
    yPos += 6;
  }
  yPos += 8;
  
  // Riscos potenciais
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...SITE_COLORS.info);
  doc.text('RISCOS POTENCIAIS', margin + 3, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SITE_COLORS.textDark);
  
  const risks: string[] = [];
  if (result.tension_level === 'high') {
    risks.push('Alto nível de tensão pode levar a desgaste e burnout');
  } else if (result.tension_level === 'moderate') {
    risks.push('Tensão moderada requer monitoramento periódico');
  }
  
  if (result.natural_d < 10) risks.push('Dificuldade em tomada de decisão rápida sob pressão');
  if (result.natural_i < 10) risks.push('Desconforto em networking e comunicação persuasiva');
  if (result.natural_s < 10) risks.push('Impaciência com processos longos e repetitivos');
  if (result.natural_c < 10) risks.push('Falta de atenção a detalhes e processos');
  
  if (risks.length > 0) {
    risks.forEach(risk => {
      doc.text(`• ${risk}`, margin + 8, yPos);
      yPos += 6;
    });
  } else {
    doc.text('• Perfil equilibrado sem riscos críticos identificados', margin + 8, yPos);
    yPos += 6;
  }
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

  // ========== CONSIDERAÇÕES FINAIS ==========
  addPage();
  addSectionTitle('CONSIDERAÇÕES FINAIS');

  addSubtitle('Sobre Este Relatório:');
  yPos += 3;

  const finalBullets = [
    'Este relatório analisa tendências comportamentais para apoiar decisões estratégicas de contratação',
    'Perfis não determinam capacidade, mas indicam adequação natural e necessidades de desenvolvimento',
    'Alta tensão entre perfil natural e adaptado indica possível desgaste - avaliar suporte necessário',
    'Nenhuma característica é estática: invista em capacitação e acompanhamento personalizado'
  ];

  finalBullets.forEach(b => addBulletPoint(b));

  yPos += 10;
  addSubtitle('Próximos Passos Sugeridos:');
  yPos += 3;

  const nextSteps = [
    'Validar insights em entrevista estruturada com o candidato',
    'Definir plano de onboarding personalizado baseado no perfil',
    'Estabelecer métricas de performance alinhadas aos primeiros 90 dias',
    'Reavaliar em 6-12 meses para acompanhar evolução'
  ];

  nextSteps.forEach(s => addBulletPoint(s));

  addFooter();

  // Generate PDF
  const pdfData = doc.output('arraybuffer');
  return new Uint8Array(pdfData);
}
