import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EditUserDialog } from "./EditUserDialog";
import { Pencil, Mail, Phone, User } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
}

export const UsersList = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [refreshTrigger]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || "client",
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
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

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleUserUpdated = () => {
    fetchUsers();
    setEditDialogOpen(false);
    setSelectedUser(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id} className="p-4 bg-card border-border hover:bg-card-hover transition-smooth">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold">{user.full_name || "Sem nome"}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getRoleBadgeColor(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditUser(user)}
                  title="Editar usuário"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedUser && (
        <EditUserDialog
          user={selectedUser}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </>
  );
};