import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, ArrowLeft, Mail, Plus, RefreshCw, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Assessment {
  id: string;
  candidate_email: string;
  candidate_name: string | null;
  status: string;
  invitation_sent_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_error_message: string | null;
  send_attempts: number;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

const Campaign = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [newCandidate, setNewCandidate] = useState({
    email: "",
    name: "",
  });
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [sendingInvitation, setSendingInvitation] = useState<string | null>(null);
  const [deletingCandidate, setDeletingCandidate] = useState<string | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Assessment | null>(null);

  useEffect(() => {
    fetchCampaignData();
  }, [id]);

  const fetchCampaignData = async () => {
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from("assessments")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false });

      if (assessmentsError) throw assessmentsError;
      setAssessments(assessmentsData || []);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Erro ao carregar campanha");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCandidate(true);

    try {
      const { error } = await supabase.from("assessments").insert({
        campaign_id: id,
        candidate_email: newCandidate.email,
        candidate_name: newCandidate.name || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Candidato adicionado com sucesso!");
      setNewCandidate({ email: "", name: "" });
      fetchCampaignData();
    } catch (error: any) {
      console.error("Error adding candidate:", error);
      toast.error(error.message || "Erro ao adicionar candidato");
    } finally {
      setAddingCandidate(false);
    }
  };

  const handleSendInvitation = async (assessment: Assessment) => {
    setSendingInvitation(assessment.id);

    try {
      const { data, error } = await supabase.functions.invoke("send-assessment-invitation", {
        body: {
          assessmentId: assessment.id,
          candidateEmail: assessment.candidate_email,
          candidateName: assessment.candidate_name,
          campaignName: campaign?.name,
        },
      });

      if (error) throw error;

      toast.success(`Convite enviado para ${assessment.candidate_email}!`);
      fetchCampaignData();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Erro ao enviar convite");
    } finally {
      setSendingInvitation(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-warning text-white" },
      sent: { label: "Enviado", className: "bg-info text-white" },
      failed: { label: "Falha", className: "bg-destructive text-white" },
      in_progress: { label: "Em Andamento", className: "bg-info text-white" },
      completed: { label: "Concluído", className: "bg-success text-white" },
    };

    const statusInfo = statusMap[status] || statusMap.pending;
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const getButtonText = (assessment: Assessment, isSending: boolean) => {
    if (isSending) return "Enviando...";
    if (assessment.status === "pending") return "Enviar Convite";
    if (assessment.status === "failed") return "Tentar Novamente";
    if (assessment.status === "sent" || assessment.status === "in_progress") return "Reenviar";
    return "Enviado";
  };

  const canResend = (assessment: Assessment) => {
    return ["pending", "sent", "failed", "in_progress"].includes(assessment.status);
  };

  const handleDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    
    setDeletingCandidate(candidateToDelete.id);

    try {
      const { error } = await supabase
        .from("assessments")
        .delete()
        .eq("id", candidateToDelete.id);

      if (error) throw error;

      toast.success("Candidato deletado com sucesso!");
      setCandidateToDelete(null);
      fetchCampaignData();
    } catch (error: any) {
      console.error("Error deleting candidate:", error);
      toast.error(error.message || "Erro ao deletar candidato");
    } finally {
      setDeletingCandidate(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center bg-card border-border">
          <p className="text-muted-foreground mb-4">Campanha não encontrada</p>
          <Button onClick={() => navigate("/dashboard")}>
            Voltar ao Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Brain className="w-8 h-8 text-primary" />
                <span className="text-xl font-bold text-primary">
                  DISC da Conversão
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{campaign.name}</h1>
            {campaign.description && (
              <p className="text-muted-foreground">{campaign.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card className="p-6 bg-card border-border sticky top-6">
                <h2 className="text-xl font-bold mb-4">Adicionar Candidato</h2>
                <form onSubmit={handleAddCandidate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome (opcional)</Label>
                    <Input
                      id="name"
                      value={newCandidate.name}
                      onChange={(e) =>
                        setNewCandidate({ ...newCandidate, name: e.target.value })
                      }
                      placeholder="Nome do candidato"
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newCandidate.email}
                      onChange={(e) =>
                        setNewCandidate({ ...newCandidate, email: e.target.value })
                      }
                      placeholder="email@exemplo.com"
                      required
                      className="bg-background border-border"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover"
                    disabled={addingCandidate}
                  >
                    {addingCandidate ? (
                      "Adicionando..."
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-4">
                Candidatos ({assessments.length})
              </h2>

              {assessments.length === 0 ? (
                <Card className="p-8 text-center bg-card border-border">
                  <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum candidato adicionado ainda.
                    <br />
                    Adicione candidatos para enviar avaliações.
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <Card
                      key={assessment.id}
                      className="p-6 bg-card border-border hover:bg-card-hover transition-smooth"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">
                            {assessment.candidate_name || "Sem nome"}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {assessment.candidate_email}
                          </p>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(assessment.status)}
                            {assessment.send_attempts > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {assessment.send_attempts} {assessment.send_attempts === 1 ? "tentativa" : "tentativas"}
                              </Badge>
                            )}
                            {assessment.last_error_message && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">{assessment.last_error_message}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={assessment.status === "failed" ? "destructive" : "outline"}
                            size="sm"
                            className={assessment.status === "failed" 
                              ? "" 
                              : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            }
                            disabled={!canResend(assessment) || sendingInvitation === assessment.id}
                            onClick={() => handleSendInvitation(assessment)}
                          >
                            {assessment.status === "pending" ? (
                              <Mail className="w-4 h-4 mr-2" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            {getButtonText(assessment, sendingInvitation === assessment.id)}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setCandidateToDelete(assessment)}
                            disabled={deletingCandidate === assessment.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <AlertDialog open={!!candidateToDelete} onOpenChange={(open) => !open && setCandidateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o candidato{" "}
              <strong>{candidateToDelete?.candidate_name || candidateToDelete?.candidate_email}</strong>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCandidate}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingCandidate ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Campaign;