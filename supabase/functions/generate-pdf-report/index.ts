import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    // Generate chart images using AI
    console.log('Generating chart images...');
    const chartImages: Record<string, string> = {};
    
    try {
      // Generate DISC comparison chart
      const discResponse = await supabaseClient.functions.invoke('generate-chart-image', {
        body: {
          chartType: 'disc-bars',
          title: 'Comparação DISC - Natural vs Adaptado',
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
          }
        }
      });
      if (discResponse.data?.imageUrl) {
        chartImages.disc = discResponse.data.imageUrl;
        console.log('DISC chart generated');
      }

      // Generate Values radar chart
      if (result.values_scores) {
        const valuesResponse = await supabaseClient.functions.invoke('generate-chart-image', {
          body: {
            chartType: 'values-radar',
            title: 'Perfil de Valores',
            data: result.values_scores
          }
        });
        if (valuesResponse.data?.imageUrl) {
          chartImages.values = valuesResponse.data.imageUrl;
          console.log('Values chart generated');
        }
      }

      // Generate Leadership pie chart
      if (result.leadership_style) {
        const leadershipResponse = await supabaseClient.functions.invoke('generate-chart-image', {
          body: {
            chartType: 'leadership-pie',
            title: 'Distribuição de Estilos de Liderança',
            data: result.leadership_style
          }
        });
        if (leadershipResponse.data?.imageUrl) {
          chartImages.leadership = leadershipResponse.data.imageUrl;
          console.log('Leadership chart generated');
        }
      }

      // Generate Competencies chart
      if (result.competencies) {
        const competenciesResponse = await supabaseClient.functions.invoke('generate-chart-image', {
          body: {
            chartType: 'competencies-bars',
            title: 'Principais Competências',
            data: result.competencies
          }
        });
        if (competenciesResponse.data?.imageUrl) {
          chartImages.competencies = competenciesResponse.data.imageUrl;
          console.log('Competencies chart generated');
        }
      }

      console.log('All charts generated successfully:', Object.keys(chartImages));
    } catch (chartError) {
      console.error('Error generating charts (continuing without images):', chartError);
    }

    // Generate PDF using Lovable AI image generation for complete professional PDF
    console.log('Generating professional PDF report with AI...');
    
    const pdfPrompt = generatePDFPrompt(assessment, result, chartImages);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI to generate PDF as image (multiple pages)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: pdfPrompt
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI PDF generation failed:', errorText);
      throw new Error(`AI PDF generation failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const pdfImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!pdfImageUrl) {
      throw new Error('No PDF image generated by AI');
    }

    // Convert base64 to blob
    const base64Data = pdfImageUrl.split(',')[1];
    const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

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

function generatePDFPrompt(assessment: any, result: any, chartImages: Record<string, string>): string {
  const primaryFactor = result.primary_profile === 'Diretor' ? 'D' :
    result.primary_profile === 'Comunicador' ? 'I' :
    result.primary_profile === 'Planejador' ? 'S' : 'C';

  const profileDescriptions: Record<string, any> = {
    D: {
      howDealsWithProblems: 'Encara problemas como desafios a serem superados rapidamente. Age de forma decisiva e direta, buscando soluções imediatas.',
      developmentPoints: ['Desenvolver paciência', 'Melhorar escuta ativa', 'Ser menos impulsivo', 'Dar atenção aos detalhes'],
      communicationTips: 'Seja direto e objetivo. Foque em resultados. Evite rodeios.'
    },
    I: {
      howDealsWithProblems: 'Aborda problemas de forma otimista e colaborativa. Busca envolver outras pessoas.',
      developmentPoints: ['Melhorar organização', 'Focar em detalhes', 'Ser mais objetivo', 'Cumprir prazos'],
      communicationTips: 'Seja amigável e entusiasta. Reconheça contribuições.'
    },
    S: {
      howDealsWithProblems: 'Analisa problemas com calma e paciência. Busca soluções que mantenham harmonia.',
      developmentPoints: ['Ser mais assertivo', 'Aceitar mudanças', 'Tomar decisões rápidas', 'Lidar com conflitos'],
      communicationTips: 'Seja paciente e cordial. Dê tempo para processar informações.'
    },
    C: {
      howDealsWithProblems: 'Analisa problemas com precisão e lógica. Busca a solução mais correta.',
      developmentPoints: ['Ser menos perfeccionista', 'Tomar decisões rápidas', 'Aceitar imperfeições', 'Ser mais flexível'],
      communicationTips: 'Seja lógico e preciso. Apresente dados e evidências.'
    }
  };

  const currentProfile = profileDescriptions[primaryFactor];

  return `Crie um relatório PDF profissional de mapeamento comportamental em formato A4 (210mm x 297mm), com design corporativo elegante em azul (#1e3a8a, #3b82f6) e branco. O PDF deve ter 12-15 páginas com o seguinte conteúdo:

**PÁGINA 1 - CAPA:**
- Título grande: "MAPEAMENTO DE PERFIL COMPORTAMENTAL"
- Logo CIS Assessment (texto estilizado em azul)
- Nome do candidato: "${assessment.candidate_name}"
- Campanha: "${assessment.campaigns?.name || 'N/A'}"
- Data: "${new Date(assessment.completed_at || assessment.created_at).toLocaleDateString('pt-BR')}"
- Design moderno com gradiente azul suave

**PÁGINA 2 - ÍNDICE:**
1. Relatório Comportamental
2. Metodologia DISC
3. Intensidade do Perfil Natural
4. Intensidade do Perfil Adaptado
5. Como Lida com Problemas
6. Pontos a Desenvolver
7. Tipos Psicológicos de Jung
8. Teoria de Valores
9. Estilo de Liderança
10. Mapa de Competências
11. Sugestões para Comunicação

**PÁGINA 3 - RELATÓRIO COMPORTAMENTAL:**
"O Relatório CIS Assessment® foi desenvolvido para melhor compreender a personalidade e as potenciais competências dos indivíduos. Através de metodologias validadas cientificamente, analisamos seis dimensões fundamentais:

• Perfil DISC (Comportamento)
• Tipos Psicológicos de Jung (Preferências cognitivas)
• Valores Pessoais (Motivações intrínsecas)
• Estilo de Liderança (Abordagem gerencial)
• Competências Comportamentais (Habilidades práticas)
• Insights para Vendas (Aplicação comercial)

Este relatório fornece uma visão profunda e objetiva do candidato."

**PÁGINA 4 - METODOLOGIA DISC:**
"A metodologia DISC foi desenvolvida pelo psicólogo William Moulton Marston em 1928. Marston identificou quatro dimensões principais:

• DOMINÂNCIA (D): Como enfrenta problemas e desafios
• INFLUÊNCIA (I): Como interage e influencia pessoas
• ESTABILIDADE (S): Como responde a mudanças
• CONFORMIDADE (C): Como responde a regras

Perfil Natural: Comportamento espontâneo e genuíno
Perfil Adaptado: Comportamento no ambiente de trabalho
Diferença entre perfis = Nível de tensão"

**PÁGINA 5 - INTENSIDADE DO PERFIL NATURAL:**
${chartImages.disc ? `Incluir gráfico: ${chartImages.disc}` : 'Criar gráfico de barras comparando D=${result.natural_d}, I=${result.natural_i}, S=${result.natural_s}, C=${result.natural_c}'}

Perfil Primário: ${result.primary_profile || 'N/A'}
Perfil Secundário: ${result.secondary_profile || 'N/A'}
Nível de Tensão: ${result.tension_level || 'Baixo'}

Descrição: "Pessoas com perfil ${primaryFactor} são ${primaryFactor === 'D' ? 'diretas e orientadas a resultados' : primaryFactor === 'I' ? 'comunicativas e entusiastas' : primaryFactor === 'S' ? 'pacientes e leais' : 'analíticas e precisas'}."

**PÁGINA 6 - INTENSIDADE DO PERFIL ADAPTADO:**
Gráfico de barras: D=${result.adapted_d}, I=${result.adapted_i}, S=${result.adapted_s}, C=${result.adapted_c}

"O perfil adaptado mostra como você ajusta seu comportamento no trabalho. ${Math.abs(result.natural_d - result.adapted_d) > 5 || Math.abs(result.natural_i - result.adapted_i) > 5 ? 'Há diferenças significativas indicando adaptação comportamental.' : 'O perfil está alinhado com o natural, indicando autenticidade.'}"

**PÁGINA 7 - COMO LIDA COM PROBLEMAS:**
${currentProfile.howDealsWithProblems}

**PÁGINA 8 - PONTOS A DESENVOLVER:**
${currentProfile.developmentPoints.map((p: string) => `• ${p}`).join('\n')}

**PÁGINA 9 - TIPOS PSICOLÓGICOS DE JUNG:**
${result.jung_type ? `
Tipo: ${result.jung_type.type || 'N/A'}
Extroversão: ${result.jung_type.extroversion || 0}
Introversão: ${result.jung_type.introversion || 0}
Intuição: ${result.jung_type.intuition || 0}
Sensação: ${result.jung_type.sensing || 0}
Pensamento: ${result.jung_type.thinking || 0}
Sentimento: ${result.jung_type.feeling || 0}

Descrição do tipo ${result.jung_type.type}
` : 'Dados não disponíveis'}

**PÁGINA 10 - TEORIA DE VALORES:**
${chartImages.values ? `Incluir gráfico radar: ${chartImages.values}` : 'Criar gráfico radar de valores'}

${result.values_scores ? Object.entries(result.values_scores)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n') : 'Dados não disponíveis'}

**PÁGINA 11 - ESTILO DE LIDERANÇA:**
${chartImages.leadership ? `Incluir gráfico pizza: ${chartImages.leadership}` : 'Criar gráfico de pizza'}

${result.leadership_style ? Object.entries(result.leadership_style)
  .map(([key, value]) => `${key}: ${value}%`)
  .join('\n') : 'Dados não disponíveis'}

**PÁGINA 12 - MAPA DE COMPETÊNCIAS:**
${chartImages.competencies ? `Incluir gráfico: ${chartImages.competencies}` : 'Criar gráfico de barras horizontais'}

Principais competências avaliadas (Natural vs Adaptado)

**PÁGINA 13 - SUGESTÕES PARA COMUNICAÇÃO:**
${currentProfile.communicationTips}

O que fazer:
• Respeitar seu estilo natural
• Adaptar comunicação às preferências
• Reconhecer pontos fortes

O que evitar:
• Ir contra suas preferências naturais
• Pressionar em áreas de desconforto

**FORMATAÇÃO:**
- Fonte: Arial/Helvetica
- Cores: Azul #1e3a8a, #3b82f6, Cinza #475569, Preto #1e293b
- Margens: 20mm (top/bottom), 15mm (left/right)
- Header: Barra azul 8mm + "CIS Assessment - Relatório Confidencial"
- Footer: "© 2025 CIS Assessment - Página X de Y"
- Espaçamento entre linhas: 1.5
- Seções separadas por linhas azuis
- Gráficos centralizados e grandes (500px width)

Crie um PDF com visual extremamente profissional, similar a relatórios corporativos de consultorias de RH. Use tipografia limpa, espaçamento generoso, e hierarquia visual clara.`;
}
