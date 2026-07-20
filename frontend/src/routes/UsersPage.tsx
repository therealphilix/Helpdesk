import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../lib/roles";
import { Navbar } from "../components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div>
      <Navbar />
      <main className="p-8 max-w-6xl mx-auto">
        <UserList />
      </main>
    </div>
  );
}

function UserList() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex-row items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage user accounts and their roles.
          </CardDescription>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Create User
        </Button>
      </CardHeader>
      <CardContent>
        <UsersTable />
        <CreateUserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </CardContent>
    </Card>
  );
}
