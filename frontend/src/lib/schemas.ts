import { z } from "zod";

export const nameField = z.string().trim().min(3, "Name must be at least 3 characters");

export const emailField = z.string().trim().email("Invalid email address");

export const passwordField = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a digit")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain a special character");

export const createUserSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
});

export const editUserSchema = z.object({
  name: nameField,
  email: emailField,
  password: z.string().default(""),
}).superRefine((data, ctx) => {
  if (data.password.length === 0) return;
  const v = data.password;
  if (v.length < 12) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Password must be at least 12 characters" });
    return;
  }
  if (!/[A-Z]/.test(v)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Must contain an uppercase letter" });
  }
  if (!/[a-z]/.test(v)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Must contain a lowercase letter" });
  }
  if (!/[0-9]/.test(v)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Must contain a digit" });
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(v)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Must contain a special character" });
  }
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type EditUserFormData = z.infer<typeof editUserSchema>;
