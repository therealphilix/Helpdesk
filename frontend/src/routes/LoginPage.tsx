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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background desk-surface px-4 py-10">
      <div className="accent-strip fixed left-0 top-0 z-50 w-full" />

      <div className="mb-8 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5L12 12l9-3.5v7L12 19 3 15.5z" />
            <path d="M12 12v7" />
            <path d="M3 8.5l9 3.5 9-3.5L12 5z" />
          </svg>
        </div>
        <h1 className="mt-3 text-[22px] font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Helpdesk</h1>
        <p className="eyebrow mt-1">Student correspondence — est. 2026</p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-[380px]"
      >
        <Card className="paper-sheet perforated-top gap-0 py-0 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary opacity-80" />
          <CardHeader className="text-center pt-7 pb-4">
            <p className="eyebrow">Clerk sign-in</p>
            <CardTitle className="text-xl mt-1" style={{ fontFamily: "var(--font-display)" }}>Open the drawer</CardTitle>
            <CardDescription className="text-[13px]">
              Enter your credentials to access the sorting room
            </CardDescription>
            <div className="mx-auto mt-3 flex items-center gap-2">
              <span className="stamp stamp-open !rotate-0 text-[9px]">Priority</span>
              <span className="stamp stamp-category !rotate-0 text-[9px]">Confidential</span>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 pb-6">
            {errors.root && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email" className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="clerk@campus.edu"
                {...register("email")}
                aria-invalid={!!errors.email}
                className="bg-card"
              />
              {errors.email && (
                <p className="text-destructive text-xs mt-1.5">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                aria-invalid={!!errors.password}
                className="bg-card"
              />
              {errors.password && (
                <p className="text-destructive text-xs mt-1.5">
                  {errors.password.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 bg-muted/40 border-t border-dashed border-border px-6 py-4">
            <Button type="submit" disabled={isSubmitting} className="w-full rounded-lg h-9 font-medium">
              {isSubmitting ? "Unlocking drawer..." : "Sign In"}
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              Protected correspondence. Posting is logged and postmarked.
            </p>
          </CardFooter>
        </Card>
        <p className="text-center eyebrow mt-4 opacity-60">Perforate along dotted line — do not fold</p>
      </form>
    </div>
  );
}
