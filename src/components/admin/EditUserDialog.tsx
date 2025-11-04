import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditUserDialogProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    role: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export const EditUserDialog = ({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: EditUserDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    email: user.email || "",
    phone: user.phone || "",
    password: "",
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "client":
        return "Empresa";
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-primary text-white";
      case "client":
        return "bg-success text-white";
      default:
        return "bg-muted";
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }

    if (!validateEmail(formData.email)) {
      toast.error("Email inválido");
      return;
    }

    if (formData.password && formData.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Sessão não encontrada");
      }

      const updateData: any = {
        user_id: user.id,
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
      };

      // Only include password if it was provided
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      const { error } = await supabase.functions.invoke("update-user", {
        body: updateData,
      });

      if (error) throw error;

      toast.success("Usuário atualizado com sucesso!");
      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      toast.error(error.message || "Erro ao atualizar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize os dados do usuário
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Role Atual</Label>
            <div>
              <Badge className={getRoleBadgeColor(user.role)}>
                {getRoleLabel(user.role)}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-full-name">
              Nome Completo <span className="text-danger">*</span>
            </Label>
            <Input
              id="edit-full-name"
              type="text"
              placeholder="Nome completo"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              className="bg-background border-border"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">
              Email <span className="text-danger">*</span>
            </Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="email@exemplo.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="bg-background border-border"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Telefone</Label>
            <Input
              id="edit-phone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="bg-background border-border"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-password">Nova Senha</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Deixe vazio para manter a senha atual"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="bg-background border-border"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 6 caracteres. Deixe vazio para não alterar.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};