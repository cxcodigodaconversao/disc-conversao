import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain } from "lucide-react";

export default function Assessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<any>(null);

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  const fetchAssessment = async () => {
    try {
      const { data, error } = await supabase
        .from("assessments")
        .select("*, campaigns(name)")
        .eq("id", id)
        .single();

      if (error) throw error;
      setAssessment(data);
    } catch (error) {
      console.error("Error fetching assessment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async () => {
    try {
      // Update assessment status to started
      await supabase
        .from("assessments")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", id);

      // TODO: Navigate to questionnaire
      alert("Funcionalidade de questionário será implementada em breve!");
    } catch (error) {
      console.error("Error starting assessment:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Brain className="w-12 h-12 animate-pulse text-primary" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Assessment não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            O link que você acessou não é válido ou o assessment foi removido.
          </p>
          <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container max-w-4xl mx-auto py-12">
        <Card className="p-8">
          <div className="text-center mb-8">
            <Brain className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-3xl font-bold mb-2">Assessment DISC</h1>
            <p className="text-lg text-muted-foreground">
              {assessment.campaigns?.name}
            </p>
          </div>

          <div className="space-y-6 mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Bem-vindo(a), {assessment.candidate_name || assessment.candidate_email}!
              </h2>
              <p className="text-muted-foreground">
                Você está prestes a iniciar o Assessment DISC, uma ferramenta que identifica
                características comportamentais através de 4 perfis principais:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 bg-card">
                <h3 className="font-semibold mb-1">D - Dominância</h3>
                <p className="text-sm text-muted-foreground">
                  Orientação para resultados e ação
                </p>
              </Card>
              <Card className="p-4 bg-card">
                <h3 className="font-semibold mb-1">I - Influência</h3>
                <p className="text-sm text-muted-foreground">
                  Foco em relacionamentos e persuasão
                </p>
              </Card>
              <Card className="p-4 bg-card">
                <h3 className="font-semibold mb-1">S - Estabilidade</h3>
                <p className="text-sm text-muted-foreground">
                  Busca por harmonia e consistência
                </p>
              </Card>
              <Card className="p-4 bg-card">
                <h3 className="font-semibold mb-1">C - Conformidade</h3>
                <p className="text-sm text-muted-foreground">
                  Atenção aos detalhes e precisão
                </p>
              </Card>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">O que esperar:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 3 etapas de questionário simples</li>
                <li>• Tempo estimado: 15-20 minutos</li>
                <li>• Responda de forma honesta e intuitiva</li>
                <li>• Não há respostas certas ou erradas</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <Button size="lg" onClick={handleStartAssessment}>
              Iniciar Assessment
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
