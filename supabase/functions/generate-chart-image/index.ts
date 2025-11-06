import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chartType, data, title } = await req.json();
    console.log('Generating chart:', chartType, title);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Generate detailed prompt based on chart type
    let prompt = '';
    
    if (chartType === 'disc-bars') {
      const { natural, adapted } = data;
      prompt = `Crie um gráfico de barras horizontais profissional mostrando comparação de perfil DISC. 
Estilo: Design moderno, limpo, corporativo com fundo branco.

Dados para exibir:
PERFIL NATURAL (lado esquerdo):
- D (Dominância): ${natural.D}/40 - Cor vermelha (#d9534f)
- I (Influência): ${natural.I}/40 - Cor laranja (#f0ad4e)
- S (Estabilidade): ${natural.S}/40 - Cor verde (#5cb85c)
- C (Conformidade): ${natural.C}/40 - Cor azul (#5bc0de)

PERFIL ADAPTADO (lado direito):
- D (Dominância): ${adapted.D}/40 - Cor vermelha (#d9534f)
- I (Influência): ${adapted.I}/40 - Cor laranja (#f0ad4e)
- S (Estabilidade): ${adapted.S}/40 - Cor verde (#5cb85c)
- C (Conformidade): ${adapted.C}/40 - Cor azul (#5bc0de)

Layout: Dois gráficos de barras verticais lado a lado. Esquerda: "Perfil Natural", Direita: "Perfil Adaptado".
Cada gráfico mostra 4 barras (D, I, S, C) com valores exibidos no topo de cada barra.
Escala: 0-40 no eixo Y. Linhas de grade profissionais. Fonte sans-serif limpa. Título no topo: "${title}".
Tamanho: 1200x600px paisagem. Alta qualidade, adequado para inclusão em PDF.`;
    
    } else if (chartType === 'values-radar') {
      const valueNames: Record<string, string> = {
        theoretical: 'Teórico',
        economic: 'Econômico',
        aesthetic: 'Estético',
        social: 'Social',
        political: 'Político',
        spiritual: 'Espiritual'
      };
      
      prompt = `Crie um gráfico radar/spider profissional mostrando Perfil de Valores.
Estilo: Design moderno, limpo com fundo branco e grade sutil.

Dados para exibir (escala 0-60):
${Object.entries(data).map(([key, value]) => 
  `- ${valueNames[key] || key}: ${value}/60`
).join('\n')}

Layout: Gráfico radar hexagonal com 6 eixos (um para cada valor).
Cores: Preencher área com azul semi-transparente (#5bc0de80), borda em azul sólido (#5bc0de).
Cada eixo rotulado com nome do valor e pontuação. Linhas de grade em 10, 20, 30, 40, 50, 60.
Título no topo: "${title}". Tamanho: 800x800px quadrado. Alta qualidade, adequado para PDF.`;
    
    } else if (chartType === 'leadership-pie') {
      prompt = `Crie um gráfico de pizza/donut profissional mostrando distribuição de Estilos de Liderança.
Estilo: Design moderno, limpo com fundo branco.

Dados para exibir:
${Object.entries(data).map(([key, value]) => {
  const name = key === 'executive' ? 'Executivo' :
    key === 'motivator' ? 'Motivador' :
    key === 'systematic' ? 'Sistemático' : 'Metódico';
  const color = key === 'executive' ? '#d9534f' :
    key === 'motivator' ? '#f0ad4e' :
    key === 'systematic' ? '#5cb85c' : '#5bc0de';
  const percentage = Math.round((value as number / 40) * 100);
  return `- ${name}: ${percentage}% - Cor: ${color}`;
}).join('\n')}

Layout: Gráfico donut com segmentos claros. Cada segmento rotulado com nome e porcentagem.
Legenda no lado direito com caixas de cores. Título no topo: "${title}".
Tamanho: 800x600px paisagem. Alta qualidade, aparência profissional, adequado para PDF.`;
    
    } else if (chartType === 'competencies-bars') {
      const entries = Object.entries(data).slice(0, 8);
      prompt = `Crie um gráfico de barras horizontais profissional mostrando níveis de Competências.
Estilo: Design moderno, limpo com fundo branco.

Dados para exibir (escala 0-40):
${entries.map(([key, value]) => {
  const cleanName = key.replace(/_n$/, '').replace(/_/g, ' ').toUpperCase();
  const level = (value as number) > 30 ? 'Alto' : (value as number) > 15 ? 'Médio' : 'Baixo';
  const color = (value as number) > 30 ? '#5cb85c' : (value as number) > 15 ? '#f0ad4e' : '#d9534f';
  return `- ${cleanName}: ${value}/40 (${level}) - Cor: ${color}`;
}).join('\n')}

Layout: Barras horizontais, ordenadas por valor. Cada barra mostra nome da competência à esquerda, valor à direita.
Cores indicam nível: Verde (Alto), Amarelo (Médio), Vermelho (Baixo). Título no topo: "${title}".
Tamanho: 900x700px. Grade profissional, fontes limpas. Alta qualidade para inclusão em PDF.`;
    }

    console.log('Prompt:', prompt.substring(0, 200) + '...');

    // Call Lovable AI to generate the image
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const result = await response.json();
    console.log('AI response received');

    // Extract the image from the response
    const imageUrl = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(result).substring(0, 500));
      throw new Error('No image generated');
    }

    console.log('Chart image generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl,
        chartType 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating chart:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});