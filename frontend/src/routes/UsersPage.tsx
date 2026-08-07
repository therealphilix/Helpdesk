import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../lib/roles";
import { AppLayout } from "../components/AppLayout";
import { Button } from "@/components/ui/button";
import { CreateUserDialog } from "../components/CreateUserDialog";
import { UsersTable } from "../components/UsersTable";

export function UsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  if (user.role !== UserRole.ADMIN) {
    navigate({ to: "/", replace: true });
    return null;
  }

  return (
    <AppLayout>
      <UserList />
    </AppLayout>
  );
}

function UserList() {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage user accounts and their roles.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Create User
        </Button>
      </div>
      <UsersTable />
      <CreateUserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
