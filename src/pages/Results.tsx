import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Download, ArrowLeft, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

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
      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("*, campaigns(name)")
        .eq("id", id)
        .single();

      if (assessmentError) throw assessmentError;
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

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Resultados não encontrados</h1>
          <p className="text-muted-foreground mb-6">
            Os resultados ainda estão sendo processados ou não existem.
          </p>
          <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
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
      </div>
    </div>
  );
}
