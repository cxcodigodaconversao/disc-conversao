import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Calendar } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  assessments_count: number;
}

export const CampaignsList = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, [refreshTrigger]);

  const fetchCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar role do usuário
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      let query = supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      // Se não for super_admin, filtrar apenas campanhas próprias
      if (roleData?.role !== "super_admin") {
        query = query.eq("created_by", user.id);
      }

      const { data: campaignsData, error: campaignsError } = await query;

      if (campaignsError) throw campaignsError;

      // Get assessment counts for each campaign
      const campaignsWithCounts = await Promise.all(
        campaignsData.map(async (campaign) => {
          const { count } = await supabase
            .from("assessments")
            .select("*", { count: "exact", head: true })
            .eq("campaign_id", campaign.id);

          return {
            ...campaign,
            assessments_count: count || 0,
          };
        })
      );

      setCampaigns(campaignsWithCounts);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="p-8 text-center bg-card border-border">
        <p className="text-muted-foreground">
          Nenhuma campanha criada ainda. Crie sua primeira campanha!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <Card
          key={campaign.id}
          className="p-6 bg-card border-border hover:bg-card-hover transition-smooth cursor-pointer"
          onClick={() => navigate(`/campaign/${campaign.id}`)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-lg">{campaign.name}</h3>
                <Badge
                  className={
                    campaign.status === "active"
                      ? "bg-success text-white"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {campaign.status === "active" ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              
              {campaign.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {campaign.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                </div>
                <div>
                  {campaign.assessments_count} avaliações
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-primary hover:text-primary-hover"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};