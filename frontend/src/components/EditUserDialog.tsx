import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiClient } from "../api/client";
import { editUserSchema, type EditUserFormData } from "../lib/schemas";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AxiosError } from "axios";

export interface EditableUser {
  id: string;
  email: string;
  name: string;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: EditableUser | null;
}

export function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editUserSchema),
    mode: "onBlur",
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({ name: user.name, email: user.email, password: "" });
    }
  }, [user, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: EditUserFormData) => {
      const payload: { name: string; email: string; password?: string } = {
        name: data.name,
        email: data.email,
      };
      if (data.password) {
        payload.password = data.password;
      }
      return apiClient.patch(`/users/${user!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (err: AxiosError<{ detail: string }>) => {
      if (err.response?.status === 409) {
        setError("email", { message: "A user with this email already exists" });
      } else {
        setError("root", {
          message: err.response?.data?.detail ?? "Failed to update user",
        });
      }
    },
  });

  const onSubmit = (data: EditUserFormData) => {
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the user's information.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="edit-name" className="mb-1.5">
              Name
            </Label>
            <Input
              id="edit-name"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-destructive text-xs mt-1.5">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-email" className="mb-1.5">
              Email
            </Label>
            <Input
              id="edit-email"
              type="email"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-destructive text-xs mt-1.5">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-password" className="mb-1.5">
              Password
            </Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Leave blank to keep current password"
              {...register("password")}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-destructive text-xs mt-1.5">
                {errors.password.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
