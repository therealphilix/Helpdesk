import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { UserRole } from "../lib/roles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AxiosError } from "axios";

export interface DeletableUser {
  id: string;
  name: string;
  role: string;
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: DeletableUser | null;
}

export function DeleteUserDialog({ open, onOpenChange, user }: DeleteUserDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/users/${user!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: () => {},
  });

  if (!user) return null;

  const isAdmin = user.role === UserRole.ADMIN;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Admin users cannot be deleted."
              : "This will deactivate the user's account and invalidate all their active sessions."}
          </DialogDescription>
        </DialogHeader>

        {!isAdmin && (
          <p className="text-sm">
            Are you sure you want to delete <strong>{user.name}</strong>?
          </p>
        )}

        {deleteMutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {(deleteMutation.error as AxiosError<{ detail: string }>)?.response?.data?.detail ?? "Failed to delete user"}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteMutation.isPending}>
            {isAdmin ? "Close" : "Cancel"}
          </Button>
          {!isAdmin && (
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
