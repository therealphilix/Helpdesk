import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { apiClient } from "../api/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditUserDialog, type EditableUser } from "./EditUserDialog";
import { DeleteUserDialog, type DeletableUser } from "./DeleteUserDialog";
import { UserRole } from "../lib/roles";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export function UsersTable() {
  const [editingUser, setEditingUser] = useState<EditableUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<DeletableUser | null>(null);

  const { data: users, isLoading, isError, error } = useQuery<UserRow[]>({
    queryKey: ["users"],
    queryFn: () => apiClient.get<UserRow[]>("/users").then((res) => res.data),
  });

  return (
    <>
      {isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-md" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                  </TableCell>
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
              <TableHead className="text-right">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                    <Badge
                      variant={u.role === UserRole.ADMIN ? "default" : "secondary"}
                      className={u.role === UserRole.ADMIN ? "bg-black text-white" : undefined}
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setEditingUser({ id: u.id, name: u.name, email: u.email })}
                        aria-label={`Edit ${u.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {u.role !== UserRole.ADMIN && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeletingUser({ id: u.id, name: u.name, role: u.role })}
                          aria-label={`Delete ${u.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <EditUserDialog
        open={editingUser !== null}
        onOpenChange={(open) => { if (!open) setEditingUser(null); }}
        user={editingUser}
      />
      <DeleteUserDialog
        open={deletingUser !== null}
        onOpenChange={(open) => { if (!open) setDeletingUser(null); }}
        user={deletingUser}
      />
    </>
  );
}
