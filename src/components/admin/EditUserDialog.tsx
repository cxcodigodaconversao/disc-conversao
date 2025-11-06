import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

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
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      console.log('Iniciando exclusão do usuário:', user.id);

      // 1. Delete from user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);
      
      if (roleError) {
        console.error('Erro ao deletar roles:', roleError);
        throw roleError;
      }

      // 2. Delete from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      if (profileError) {
        console.error('Erro ao deletar profile:', profileError);
        throw profileError;
      }

      // 3. Delete from auth.users (via edge function)
      const { error: authError } = await supabase.functions.invoke('delete-user', {
        body: { user_id: user.id }
      });
      
      if (authError) {
        console.error('Erro ao deletar do auth:', authError);
        throw authError;
      }

      toast.success("Usuário excluído com sucesso!");
      onUserUpdated();
      onOpenChange(false);
      setShowDeleteAlert(false);
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      toast.error(error.message || "Erro ao excluir usuário");
    } finally {
      setDeleting(false);
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
              variant="destructive"
              onClick={() => setShowDeleteAlert(true)}
              disabled={loading || deleting}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Usuário
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || deleting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || deleting}>
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

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário <strong>{user.full_name}</strong> será permanentemente excluído do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-danger hover:bg-danger/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Sim, excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};