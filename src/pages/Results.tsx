import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Download, ArrowLeft, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { 
  PROFILE_BASE_DESCRIPTIONS, 
  ROLE_MAPPINGS, 
  STRATEGIC_INTERPRETATIONS,
  getCombinedProfile,
  generateHiringConclusion,
  DECISION_MATRIX,
  EVOLUTION_SCALE
} from "@/lib/disc-data";

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async () => {
    try {
      // Verificar autenticação
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAssessment(null);
        setResult(null);
        setLoading(false);
        return;
      }

      // Buscar assessment e validar acesso
      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("*, campaigns(name, created_by)")
        .eq("id", id)
        .single();

      if (assessmentError) throw assessmentError;

      // Verificar role do usuário
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const isSuperAdmin = roleData?.role === "super_admin";

      // Verificar se o usuário é o criador da campanha (ou super_admin)
      if (!isSuperAdmin && assessmentData.campaigns.created_by !== user.id) {
        setAssessment(null);
        setResult(null);
        setLoading(false);
        return;
      }

      setAssessment(assessmentData);

      const { data: resultData, error: resultError } = await supabase
        .from("results" as any)
        .select("*")
        .eq("assessment_id", id)
        .single();

      if (resultError) throw resultError;
      setResult(resultData);
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (result?.report_url) {
      window.open(result.report_url, '_blank');
    } else {
      // Trigger PDF generation
      try {
        const { data, error } = await supabase.functions.invoke(
          'generate-pdf-report',
          { body: { assessment_id: id } }
        );

        if (error) throw error;
        
        if (data.pdf_url) {
          window.open(data.pdf_url, '_blank');
          setResult({ ...result, report_url: data.pdf_url });
        }
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    }
  };

  const handleRegeneratePDF = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'regenerate-pdf',
        { body: { assessment_id: id } }
      );

      if (error) throw error;
      
      if (data.pdf_url) {
        setResult({ ...result, report_url: data.pdf_url });
        window.open(data.pdf_url, '_blank');
      }
    } catch (error) {
      console.error('Error regenerating PDF:', error);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Brain className="w-12 h-12 animate-pulse text-primary" />
      </div>
    );
  }

  if (!result || !assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="p-8 max-w-md text-center border-red-200">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-red-100 p-4">
              <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-4 text-red-600">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-6">
            Você não tem permissão para visualizar estes resultados. Apenas o responsável pela campanha pode acessá-los.
          </p>
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            Voltar ao Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // DISC data on 0-40 scale for accurate visualization
  const discData = [
    {
      name: 'D (Diretor)',
      Natural: result.natural_d,
      Adaptado: result.adapted_d
    },
    {
      name: 'I (Comunicador)',
      Natural: result.natural_i,
      Adaptado: result.adapted_i
    },
    {
      name: 'S (Planejador)',
      Natural: result.natural_s,
      Adaptado: result.adapted_s
    },
    {
      name: 'C (Analista)',
      Natural: result.natural_c,
      Adaptado: result.adapted_c
    }
  ];

  const valuesData = [
    { subject: 'Teórico', value: result.values_scores?.theoretical || 0 },
    { subject: 'Econômico', value: result.values_scores?.economic || 0 },
    { subject: 'Estético', value: result.values_scores?.aesthetic || 0 },
    { subject: 'Social', value: result.values_scores?.social || 0 },
    { subject: 'Político', value: result.values_scores?.political || 0 },
    { subject: 'Espiritual', value: result.values_scores?.spiritual || 0 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Button>
          <div className="flex gap-2">
            <Button 
              onClick={handleRegeneratePDF} 
              variant="outline" 
              className="gap-2"
              disabled={regenerating}
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Regenerando...' : 'Regenerar PDF'}
            </Button>
            <Button onClick={handleDownloadPDF} className="gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Title */}
        <Card className="p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Brain className="w-12 h-12 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Relatório DISC</h1>
              <p className="text-muted-foreground">
                {assessment?.candidate_name || assessment?.candidate_email}
              </p>
              <p className="text-sm text-muted-foreground">
                {assessment?.campaigns?.name}
              </p>
            </div>
          </div>
        </Card>

        {/* Profile Summary */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Resumo do Perfil</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Perfil Primário</h3>
              <p className="text-3xl font-bold text-primary">{result.primary_profile}</p>
              {result.secondary_profile && (
                <>
                  <h3 className="font-semibold mb-2 mt-4">Perfil Secundário</h3>
                  <p className="text-2xl font-bold text-secondary">{result.secondary_profile}</p>
                </>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Tensão Adaptativa</h3>
              <p className="text-2xl font-bold">{result.total_tension}</p>
              <p className="text-sm text-muted-foreground capitalize">
                Nível: {result.tension_level === 'low' ? 'Baixo' : result.tension_level === 'moderate' ? 'Moderado' : 'Alto'}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-muted-foreground">{result.profile_description}</p>
          </div>
        </Card>

        {/* DISC Chart */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Perfil DISC</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={discData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 40]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Natural" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Adaptado" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Sales Insights */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Insights para Vendas</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-green-600">🎯 Pontos Fortes</h3>
              <ul className="space-y-2">
                {result.sales_insights?.strengths?.map((strength: string, i: number) => (
                  <li key={i} className="text-sm">• {strength}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-orange-600">⚠️ Pontos de Atenção</h3>
              <ul className="space-y-2">
                {result.sales_insights?.weaknesses?.map((weakness: string, i: number) => (
                  <li key={i} className="text-sm">• {weakness}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">👤 Cliente Ideal</h3>
              <p className="text-sm text-muted-foreground">{result.sales_insights?.ideal_customer}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🎤 Abordagem de Vendas</h3>
              <p className="text-sm text-muted-foreground">{result.sales_insights?.sales_approach}</p>
            </div>
          </div>
        </Card>

        {/* Values Chart */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Valores Motivacionais</h2>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={valuesData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis domain={[0, 60]} />
              <Radar name="Valores" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Jung Type */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Tipo Psicológico (Jung)</h2>
          <p className="text-4xl font-bold text-primary mb-4">{result.jung_type?.type || 'N/A'}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Extroversão</p>
              <p className="font-semibold">{result.jung_type?.extroversion || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Introversão</p>
              <p className="font-semibold">{result.jung_type?.introversion || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Intuição</p>
              <p className="font-semibold">{result.jung_type?.intuition || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sensação</p>
              <p className="font-semibold">{result.jung_type?.sensation || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pensamento</p>
              <p className="font-semibold">{result.jung_type?.thinking || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sentimento</p>
              <p className="font-semibold">{result.jung_type?.feeling || 0}%</p>
            </div>
          </div>
        </Card>

        {/* Leadership Styles */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6">Estilos de Liderança</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{result.leadership_style?.executive || 0}%</p>
              <p className="text-sm text-muted-foreground">Executivo</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{result.leadership_style?.motivator || 0}%</p>
              <p className="text-sm text-muted-foreground">Motivador</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{result.leadership_style?.systematic || 0}%</p>
              <p className="text-sm text-muted-foreground">Sistemático</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{result.leadership_style?.methodical || 0}%</p>
              <p className="text-sm text-muted-foreground">Metódico</p>
            </div>
          </div>
        </Card>

        {/* Hiring Analysis Section */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 text-primary">Análise para Contratação</h2>
          
          {/* Profile Base Table */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">1. Perfil Base – Descrição dos Quatro Estilos</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-primary/10">
                    <th className="border p-2 text-left">Perfil</th>
                    <th className="border p-2 text-left">Características-Chave</th>
                    <th className="border p-2 text-left">Linguagem que Motiva</th>
                    <th className="border p-2 text-left">Ponto de Atenção</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(PROFILE_BASE_DESCRIPTIONS).map(([factor, desc]) => (
                    <tr key={factor} className="hover:bg-muted/50">
                      <td className="border p-2 font-semibold">{factor}</td>
                      <td className="border p-2">{desc.characteristics}</td>
                      <td className="border p-2">{desc.motivatingLanguage}</td>
                      <td className="border p-2 text-orange-600">{desc.attentionPoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Mapping */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">2. Mapeamento por Função</h3>
            <div className="grid gap-4">
              {Object.entries(ROLE_MAPPINGS).map(([role, mapping]) => (
                <div key={role} className="border-l-4 border-primary pl-4 py-2">
                  <h4 className="font-bold text-lg mb-2">{role}</h4>
                  <p className="text-sm mb-1">
                    <span className="font-semibold">Perfis indicados:</span>{' '}
                    <span className="text-green-600">{mapping.mostIndicated.join(', ')}</span>
                  </p>
                  <p className="text-sm mb-1">
                    <span className="font-semibold">Perfis que exigem adaptação:</span>{' '}
                    <span className="text-orange-600">{mapping.requiresAdaptation.join(', ')}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">Desenvolvimento:</span> {mapping.developmentRecommendations}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Interpretation */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">3. Interpretação Estratégica deste Candidato</h3>
            {(() => {
              const combinedProfile = getCombinedProfile(
                result.natural_d,
                result.natural_i,
                result.natural_s,
                result.natural_c
              );
              const interpretation = STRATEGIC_INTERPRETATIONS[combinedProfile];
              
              return (
                <div className="bg-secondary/10 p-4 rounded-lg">
                  <p className="font-bold text-lg mb-3">Perfil: {combinedProfile}</p>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-green-700">Potencial Profissional:</p>
                      <p className="text-sm">{interpretation.potential}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-orange-700">Limites do Perfil:</p>
                      <p className="text-sm">{interpretation.limitations}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-primary">Sugestão para Contratação:</p>
                      <p className="text-sm">{interpretation.hiringRecommendation}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Decision Matrix */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">4. Matriz de Decisão de Contratação</h3>
            <div className="space-y-2">
              {Object.entries(DECISION_MATRIX).map(([key, item]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <div>
                    <p className="text-sm font-medium">{item.question}</p>
                    <p className="text-xs text-muted-foreground">{item.highInterpretation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evolution Scale */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">5. Escala de Potencial de Evolução</h3>
            <div className="space-y-3">
              {Object.entries(EVOLUTION_SCALE).map(([level, data]) => (
                <div key={level} className="flex gap-3">
                  <div className="font-bold text-primary min-w-[120px]">{level}</div>
                  <div className="text-sm">
                    <p>{data.description}</p>
                    <p className="text-muted-foreground">Aplicação: {data.application}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Automatic Conclusion */}
          <div className="bg-primary/5 p-6 rounded-lg border-2 border-primary">
            <h3 className="text-xl font-semibold mb-4 text-primary">6. Conclusão Automática</h3>
            <p className="text-sm leading-relaxed">
              {generateHiringConclusion(
                getCombinedProfile(result.natural_d, result.natural_i, result.natural_s, result.natural_c),
                result.natural_d,
                result.natural_i,
                result.natural_s,
                result.natural_c,
                result.tension_level
              )}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
