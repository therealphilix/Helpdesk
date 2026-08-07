import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AxiosError } from "axios";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a digit")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain a special character"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  if (user) {
    navigate({ to: "/dashboard", replace: true });
    return null;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail: string }>;
      setError("root", {
        message: axiosErr.response?.data?.detail ?? "Login failed",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="accent-strip fixed left-0 top-0 z-50 w-full" />
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.2 8.5c.6.6.6 1.5 0 2.1l-2.8 2.8c-.3.3-.3.8 0 1.1l2.8 2.8c.6.6.6 1.5 0 2.1L18.5 22c-.6.6-1.5.6-2.1 0l-2.8-2.8c-.3-.3-.8-.3-1.1 0L9.7 22c-.6.6-1.5.6-2.1 0l-2.7-2.7c-.6-.6-.6-1.5 0-2.1l2.8-2.8c.3-.3.3-.8 0-1.1L4.9 10.5c-.6-.6-.6-1.5 0-2.1L7.6 5.7c.6-.6 1.5-.6 2.1 0l2.8 2.8c.3.3.8.3 1.1 0l2.8-2.8c.6-.6 1.5-.6 2.1 0l2.7 2.8Z" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Helpdesk</h1>
      </div>
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm"
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {errors.root && (
              <Alert variant="destructive">
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email" className="mb-1.5">
                Email
              </Label>
              <Input
                id="email"
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
              <Label htmlFor="password" className="mb-1.5">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-destructive text-xs mt-1.5">
                  {errors.password.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
