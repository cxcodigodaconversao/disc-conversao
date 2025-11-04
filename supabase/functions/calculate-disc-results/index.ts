import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Response {
  assessment_id: string;
  stage: 'natural' | 'adapted' | 'values';
  group_number: number;
  item_text: string;
  item_factor: string;
  rank: number;
}

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
    
    console.log('Calculating DISC results for assessment:', assessment_id);

    // Fetch all responses
    const { data: responses, error: responsesError } = await supabaseClient
      .from('responses')
      .select('*')
      .eq('assessment_id', assessment_id);

    if (responsesError) throw responsesError;
    if (!responses || responses.length === 0) {
      throw new Error('No responses found');
    }

    // Separate by stage
    const naturalResponses = responses.filter((r: Response) => r.stage === 'natural');
    const adaptedResponses = responses.filter((r: Response) => r.stage === 'adapted');
    const valuesResponses = responses.filter((r: Response) => r.stage === 'values');

    // Calculate DISC scores (weights: 1st=4pts, 2nd=3pts, 3rd=2pts, 4th=1pt)
    const calculateDISC = (responses: Response[]) => {
      const scores = { D: 0, I: 0, S: 0, C: 0 };
      
      responses.forEach((r: Response) => {
        const points = 5 - r.rank; // 1st rank = 4pts, 2nd = 3pts, etc.
        const factor = r.item_factor as 'D' | 'I' | 'S' | 'C';
        scores[factor] += points;
      });

      // Convert to percentage (max = 10 groups * 4 points = 40)
      return {
        D: Math.round((scores.D / 40) * 100),
        I: Math.round((scores.I / 40) * 100),
        S: Math.round((scores.S / 40) * 100),
        C: Math.round((scores.C / 40) * 100),
      };
    };

    const naturalDISC = calculateDISC(naturalResponses);
    const adaptedDISC = calculateDISC(adaptedResponses);

    // Calculate Delta
    const delta = {
      D: Math.abs(naturalDISC.D - adaptedDISC.D),
      I: Math.abs(naturalDISC.I - adaptedDISC.I),
      S: Math.abs(naturalDISC.S - adaptedDISC.S),
      C: Math.abs(naturalDISC.C - adaptedDISC.C),
    };
    const totalTension = delta.D + delta.I + delta.S + delta.C;
    const tensionLevel = totalTension < 20 ? 'low' : totalTension < 40 ? 'moderate' : 'high';

    // Calculate Values (weights: 1st=6pts, 2nd=5pts, ..., 6th=1pt)
    const calculateValues = (responses: Response[]) => {
      const scores: Record<string, number> = {
        theoretical: 0,
        economic: 0,
        aesthetic: 0,
        social: 0,
        political: 0,
        spiritual: 0,
      };

      responses.forEach((r: Response) => {
        const points = 7 - r.rank;
        scores[r.item_factor] += points;
      });

      // Convert to percentage (max = 10 groups * 6 points = 60)
      return {
        theoretical: Math.round((scores.theoretical / 60) * 100),
        economic: Math.round((scores.economic / 60) * 100),
        aesthetic: Math.round((scores.aesthetic / 60) * 100),
        social: Math.round((scores.social / 60) * 100),
        political: Math.round((scores.political / 60) * 100),
        spiritual: Math.round((scores.spiritual / 60) * 100),
      };
    };

    const values = calculateValues(valuesResponses);

    // Determine primary and secondary profiles
    const discArray = [
      { name: 'Diretor', factor: 'D', score: naturalDISC.D },
      { name: 'Comunicador', factor: 'I', score: naturalDISC.I },
      { name: 'Planejador', factor: 'S', score: naturalDISC.S },
      { name: 'Analista', factor: 'C', score: naturalDISC.C },
    ].sort((a, b) => b.score - a.score);

    const primaryProfile = discArray[0].name;
    const secondaryProfile = discArray[1].score >= 50 ? discArray[1].name : null;

    // Calculate competencies (based on DISC scores)
    const competencies = {
      // D competencies
      boldness_n: naturalDISC.D,
      command_n: naturalDISC.D,
      objectivity_n: naturalDISC.D,
      assertiveness_n: naturalDISC.D,
      boldness_a: adaptedDISC.D,
      command_a: adaptedDISC.D,
      objectivity_a: adaptedDISC.D,
      assertiveness_a: adaptedDISC.D,
      
      // I competencies
      persuasion_n: naturalDISC.I,
      extroversion_n: naturalDISC.I,
      enthusiasm_n: naturalDISC.I,
      sociability_n: naturalDISC.I,
      persuasion_a: adaptedDISC.I,
      extroversion_a: adaptedDISC.I,
      enthusiasm_a: adaptedDISC.I,
      sociability_a: adaptedDISC.I,
      
      // S competencies
      empathy_n: naturalDISC.S,
      patience_n: naturalDISC.S,
      persistence_n: naturalDISC.S,
      planning_n: naturalDISC.S,
      empathy_a: adaptedDISC.S,
      patience_a: adaptedDISC.S,
      persistence_a: adaptedDISC.S,
      planning_a: adaptedDISC.S,
      
      // C competencies
      organization_n: naturalDISC.C,
      detail_n: naturalDISC.C,
      prudence_n: naturalDISC.C,
      concentration_n: naturalDISC.C,
      organization_a: adaptedDISC.C,
      detail_a: adaptedDISC.C,
      prudence_a: adaptedDISC.C,
      concentration_a: adaptedDISC.C,
    };

    // Calculate Jung types
    const jungScores = {
      extroversion: Math.round((naturalDISC.D + naturalDISC.I) / 2),
      introversion: Math.round((naturalDISC.S + naturalDISC.C) / 2),
      intuition: Math.round((naturalDISC.D + naturalDISC.I) / 2),
      sensation: Math.round((naturalDISC.S + naturalDISC.C) / 2),
      thinking: Math.round((naturalDISC.D + naturalDISC.C) / 2),
      feeling: Math.round((naturalDISC.I + naturalDISC.S) / 2),
    };

    const jungType = 
      (jungScores.extroversion > jungScores.introversion ? 'E' : 'I') +
      (jungScores.intuition > jungScores.sensation ? 'N' : 'S') +
      (jungScores.thinking > jungScores.feeling ? 'T' : 'F') +
      (naturalDISC.C > 50 ? 'J' : 'P');

    // Calculate leadership styles
    const leadership = {
      executive: naturalDISC.D,
      motivator: naturalDISC.I,
      systematic: naturalDISC.S,
      methodical: naturalDISC.C,
    };

    // Generate sales insights
    const generateSalesInsights = () => {
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      let idealCustomer = '';
      let salesApproach = '';

      if (naturalDISC.D >= 60) {
        strengths.push('Fechamento direto e rápido');
        strengths.push('Foco em resultados');
        weaknesses.push('Pode ser muito agressivo');
        idealCustomer = 'Decisores de alto nível que valorizam eficiência';
        salesApproach = 'Abordagem direta, focada em ROI e resultados tangíveis';
      } else if (naturalDISC.I >= 60) {
        strengths.push('Construção de relacionamentos');
        strengths.push('Entusiasmo contagiante');
        weaknesses.push('Pode perder foco em detalhes');
        idealCustomer = 'Clientes que valorizam networking e experiências';
        salesApproach = 'Abordagem social, storytelling e demonstrações empolgantes';
      } else if (naturalDISC.S >= 60) {
        strengths.push('Paciência no ciclo de vendas');
        strengths.push('Fidelização de clientes');
        weaknesses.push('Dificuldade com pressão e urgência');
        idealCustomer = 'Clientes que precisam de suporte contínuo';
        salesApproach = 'Abordagem consultiva, construindo confiança ao longo do tempo';
      } else if (naturalDISC.C >= 60) {
        strengths.push('Apresentações detalhadas');
        strengths.push('Precisão técnica');
        weaknesses.push('Lentidão no fechamento');
        idealCustomer = 'Clientes técnicos que exigem dados e provas';
        salesApproach = 'Abordagem analítica com documentação completa e casos de estudo';
      } else {
        strengths.push('Versatilidade');
        strengths.push('Adaptabilidade');
        weaknesses.push('Falta de especialização');
        idealCustomer = 'Diversos tipos de clientes';
        salesApproach = 'Abordagem flexível adaptada ao perfil do cliente';
      }

      return { strengths, weaknesses, idealCustomer, salesApproach };
    };

    const salesInsights = generateSalesInsights();

    const profileDescription = `Perfil ${primaryProfile}${secondaryProfile ? '/' + secondaryProfile : ''} - ${
      primaryProfile === 'Diretor' ? 'Orientado para resultados, decisivo e direto' :
      primaryProfile === 'Comunicador' ? 'Entusiasta, persuasivo e sociável' :
      primaryProfile === 'Planejador' ? 'Paciente, confiável e leal' :
      'Preciso, sistemático e detalhista'
    }`;

    // Insert result
    const { data: result, error: insertError } = await supabaseClient
      .from('results')
      .insert({
        assessment_id,
        natural_d: naturalDISC.D,
        natural_i: naturalDISC.I,
        natural_s: naturalDISC.S,
        natural_c: naturalDISC.C,
        adapted_d: adaptedDISC.D,
        adapted_i: adaptedDISC.I,
        adapted_s: adaptedDISC.S,
        adapted_c: adaptedDISC.C,
        delta_d: delta.D,
        delta_i: delta.I,
        delta_s: delta.S,
        delta_c: delta.C,
        total_tension: totalTension,
        tension_level: tensionLevel,
        theoretical: values.theoretical,
        economic: values.economic,
        aesthetic: values.aesthetic,
        social: values.social,
        political: values.political,
        spiritual: values.spiritual,
        primary_profile: primaryProfile,
        secondary_profile: secondaryProfile,
        profile_description: profileDescription,
        jung_type: jungType,
        extroversion: jungScores.extroversion,
        introversion: jungScores.introversion,
        intuition: jungScores.intuition,
        sensation: jungScores.sensation,
        thinking: jungScores.thinking,
        feeling: jungScores.feeling,
        leadership_executive: leadership.executive,
        leadership_motivator: leadership.motivator,
        leadership_systematic: leadership.systematic,
        leadership_methodical: leadership.methodical,
        sales_strengths: salesInsights.strengths,
        sales_weaknesses: salesInsights.weaknesses,
        ideal_customer: salesInsights.idealCustomer,
        sales_approach: salesInsights.salesApproach,
        comp_boldness_n: competencies.boldness_n,
        comp_command_n: competencies.command_n,
        comp_objectivity_n: competencies.objectivity_n,
        comp_assertiveness_n: competencies.assertiveness_n,
        comp_persuasion_n: competencies.persuasion_n,
        comp_extroversion_n: competencies.extroversion_n,
        comp_enthusiasm_n: competencies.enthusiasm_n,
        comp_sociability_n: competencies.sociability_n,
        comp_empathy_n: competencies.empathy_n,
        comp_patience_n: competencies.patience_n,
        comp_persistence_n: competencies.persistence_n,
        comp_planning_n: competencies.planning_n,
        comp_organization_n: competencies.organization_n,
        comp_detail_n: competencies.detail_n,
        comp_prudence_n: competencies.prudence_n,
        comp_concentration_n: competencies.concentration_n,
        comp_boldness_a: competencies.boldness_a,
        comp_command_a: competencies.command_a,
        comp_objectivity_a: competencies.objectivity_a,
        comp_assertiveness_a: competencies.assertiveness_a,
        comp_persuasion_a: competencies.persuasion_a,
        comp_extroversion_a: competencies.extroversion_a,
        comp_enthusiasm_a: competencies.enthusiasm_a,
        comp_sociability_a: competencies.sociability_a,
        comp_empathy_a: competencies.empathy_a,
        comp_patience_a: competencies.patience_a,
        comp_persistence_a: competencies.persistence_a,
        comp_planning_a: competencies.planning_a,
        comp_organization_a: competencies.organization_a,
        comp_detail_a: competencies.detail_a,
        comp_prudence_a: competencies.prudence_a,
        comp_concentration_a: competencies.concentration_a,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('Results calculated successfully:', result.id);

    return new Response(
      JSON.stringify({ success: true, result_id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating results:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
