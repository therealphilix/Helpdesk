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
      <div className="flex items-end justify-between gap-4 mb-2">
        <div>
          <p className="eyebrow">Personnel</p>
          <h1 className="text-[28px] font-semibold tracking-tight leading-none mt-1" style={{ fontFamily: "var(--font-display)" }}>Users</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Clerks and administrators with drawer access.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="rounded-full">
          <Plus className="size-4" />
          Create User
        </Button>
      </div>
      <div className="brass-rule my-6" />
      <div className="paper-sheet rounded-xl overflow-hidden p-1">
        <UsersTable />
      </div>
      <CreateUserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
