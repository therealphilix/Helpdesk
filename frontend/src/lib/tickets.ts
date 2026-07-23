export const TicketStatus = {
  OPEN: "open",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketCategory = {
  GENERAL_QUESTION: "general question",
  TECHNICAL_QUESTION: "technical question",
  REFUND_REQUEST: "refund request",
} as const;

export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const statusVariant: Record<string, "default" | "secondary" | "success"> = {
  open: "default",
  resolved: "success",
  closed: "secondary",
}
