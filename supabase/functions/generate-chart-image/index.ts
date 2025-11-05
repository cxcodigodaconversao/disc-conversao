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
      prompt = `Create a professional horizontal bar chart showing DISC profile comparison. 
Style: Modern, clean, corporate design with white background.

Data to display:
NATURAL PROFILE (left side):
- D (Dominance): ${natural.D}/40 - Red color (#EF4444)
- I (Influence): ${natural.I}/40 - Orange color (#F59E0B)
- S (Steadiness): ${natural.S}/40 - Green color (#10B981)
- C (Compliance): ${natural.C}/40 - Blue color (#3B82F6)

ADAPTED PROFILE (right side):
- D (Dominance): ${adapted.D}/40 - Red color (#EF4444)
- I (Influence): ${adapted.I}/40 - Orange color (#F59E0B)
- S (Steadiness): ${adapted.S}/40 - Green color (#10B981)
- C (Compliance): ${adapted.C}/40 - Blue color (#3B82F6)

Layout: Two side-by-side vertical bar charts. Left: "Natural Profile", Right: "Adapted Profile".
Each chart shows 4 bars (D, I, S, C) with values displayed on top of each bar.
Scale: 0-40 on Y-axis. Professional grid lines. Clean sans-serif font. Title at top: "${title}".
Size: 1200x600px landscape. High quality, suitable for PDF inclusion.`;
    
    } else if (chartType === 'values-radar') {
      prompt = `Create a professional radar/spider chart showing Values Profile.
Style: Modern, clean design with white background and subtle grid.

Data to display (scale 0-60):
${Object.entries(data).map(([key, value]) => 
  `- ${key}: ${value}/60`
).join('\n')}

Layout: Hexagonal radar chart with 6 axes (one for each value).
Colors: Fill area with semi-transparent blue (#3B82F680), border in solid blue (#3B82F6).
Each axis labeled with value name and score. Grid lines at 10, 20, 30, 40, 50, 60.
Title at top: "${title}". Size: 800x800px square. High quality, suitable for PDF.`;
    
    } else if (chartType === 'leadership-pie') {
      prompt = `Create a professional pie/donut chart showing Leadership Styles distribution.
Style: Modern, clean design with white background.

Data to display:
${Object.entries(data).map(([key, value]) => {
  const name = key === 'executive' ? 'Executive' :
    key === 'motivator' ? 'Motivator' :
    key === 'systematic' ? 'Systematic' : 'Methodical';
  const color = key === 'executive' ? '#EF4444' :
    key === 'motivator' ? '#F59E0B' :
    key === 'systematic' ? '#10B981' : '#3B82F6';
  const percentage = Math.round((value as number / 40) * 100);
  return `- ${name}: ${percentage}% - Color: ${color}`;
}).join('\n')}

Layout: Donut chart with clear segments. Each segment labeled with name and percentage.
Legend on the right side with color boxes. Title at top: "${title}".
Size: 800x600px landscape. High quality, professional appearance, suitable for PDF.`;
    
    } else if (chartType === 'competencies-bars') {
      const entries = Object.entries(data).slice(0, 8);
      prompt = `Create a professional horizontal bar chart showing Competencies levels.
Style: Modern, clean design with white background.

Data to display (scale 0-40):
${entries.map(([key, value]) => {
  const cleanName = key.replace(/_n$/, '').replace(/_/g, ' ').toUpperCase();
  const level = (value as number) > 30 ? 'High' : (value as number) > 15 ? 'Medium' : 'Low';
  const color = (value as number) > 30 ? '#10B981' : (value as number) > 15 ? '#F59E0B' : '#EF4444';
  return `- ${cleanName}: ${value}/40 (${level}) - Color: ${color}`;
}).join('\n')}

Layout: Horizontal bars, sorted by value. Each bar shows competency name on left, value on right.
Colors indicate level: Green (High), Yellow (Medium), Red (Low). Title at top: "${title}".
Size: 900x700px. Professional grid, clean fonts. High quality for PDF inclusion.`;
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