import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export const UsersList = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [refreshTrigger]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name");

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
    <div className="space-y-4">
      {users.map((user) => (
        <Card key={user.id} className="p-4 bg-card border-border hover:bg-card-hover transition-smooth">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{user.full_name || "Sem nome"}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge className={getRoleBadgeColor(user.role)}>
              {getRoleLabel(user.role)}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
};