import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../api/client";
import { Navbar } from "../components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        isAdmin
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {role}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        active
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function UsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  if (user.role !== "admin") {
    navigate({ to: "/", replace: true });
    return null;
  }

  return (
    <div>
      <Navbar />
      <main className="p-8">
        <UserList />
      </main>
    </div>
  );
}

function UserList() {
  const { data: users, isLoading, isError, error } = useQuery<UserRow[]>({
    queryKey: ["users"],
    queryFn: () => apiClient.get<UserRow[]>("/users").then((res) => res.data),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Manage user accounts and their roles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="py-8 text-center text-muted-foreground">
            Loading users...
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load users."}
            </AlertDescription>
          </Alert>
        )}

        {users && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={u.role} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge active={u.is_active} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
