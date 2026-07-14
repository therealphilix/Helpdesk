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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "success" : "destructive"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
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
