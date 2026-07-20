export const UserRole = {
  ADMIN: "admin",
  AGENT: "agent",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
