import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Users, Target } from "lucide-react";
import { toast } from "sonner";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { UsersList } from "@/components/admin/UsersList";
import { CreateCampaignDialog } from "@/components/campaigns/CreateCampaignDialog";
import { CampaignsList } from "@/components/campaigns/CampaignsList";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [refreshUsers, setRefreshUsers] = useState(0);
  const [refreshCampaigns, setRefreshCampaigns] = useState(0);
  const [stats, setStats] = useState({
    campaigns: 0,
    assessments: 0,
    pending: 0,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      setUserEmail(session.user.email || "");
      
      // Check user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      setUserRole(roleData?.role || null);
      
      // Fetch stats
      fetchStats();
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const { count: campaignsCount } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      const { count: assessmentsCount } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true });

      const { count: pendingCount } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      setStats({
        campaigns: campaignsCount || 0,
        assessments: assessmentsCount || 0,
        pending: pendingCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold text-primary">DISC da Conversão</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{userEmail}</span>
              <Button variant="outline" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground mb-8">Bem-vindo ao painel administrativo</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Campanhas</h3>
              </div>
              <p className="text-3xl font-bold text-primary">{stats.campaigns}</p>
              <p className="text-sm text-muted-foreground mt-1">Campanhas ativas</p>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Avaliações</h3>
              </div>
              <p className="text-3xl font-bold text-primary">{stats.assessments}</p>
              <p className="text-sm text-muted-foreground mt-1">Avaliações realizadas</p>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Pendentes</h3>
              </div>
              <p className="text-3xl font-bold text-primary">{stats.pending}</p>
              <p className="text-sm text-muted-foreground mt-1">Aguardando resposta</p>
            </Card>
          </div>

          <Tabs defaultValue="campaigns" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-card">
              <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
              <TabsTrigger value="users" disabled={!userRole || (userRole !== "super_admin" && userRole !== "admin")}>
                Usuários
              </TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gerenciar Campanhas</h2>
                <CreateCampaignDialog
                  onCampaignCreated={() => {
                    setRefreshCampaigns((prev) => prev + 1);
                    fetchStats();
                  }}
                />
              </div>
              <CampaignsList refreshTrigger={refreshCampaigns} />
            </TabsContent>

            {(userRole === "super_admin" || userRole === "admin") && (
              <TabsContent value="users" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
                  <CreateUserDialog
                    onUserCreated={() => setRefreshUsers((prev) => prev + 1)}
                  />
                </div>
                <UsersList refreshTrigger={refreshUsers} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
