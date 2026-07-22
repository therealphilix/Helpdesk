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
