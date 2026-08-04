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

export const statusOptions: { value: string; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
]

export const SenderType = {
  AGENT: "agent",
  CUSTOMER: "customer",
} as const;

export type SenderType = (typeof SenderType)[keyof typeof SenderType];

export interface ReplyOut {
  id: string
  ticket_id: string
  sender_type: SenderType
  author_id: string | null
  author_name: string | null
  body_text: string
  body_html: string | null
  created_at: string
}

export interface DashboardStats {
  total_tickets: number
  open_tickets: number
  ai_resolved_count: number
  ai_resolved_percentage: number
  avg_resolution_time_hours: number
}

export const categoryOptions: { value: string; label: string }[] = [
  { value: "general question", label: "General Question" },
  { value: "technical question", label: "Technical Question" },
  { value: "refund request", label: "Refund Request" },
]

export interface TicketsPerDayEntry {
  date: string
  count: number
}

export interface Ticket {
  id: string
  sender_email: string
  sender_name: string | null
  subject: string
  body_text: string
  body_html: string | null
  status: TicketStatus
  category: TicketCategory | null
  assigned_to: string | null
  assignee_name: string | null
  replies: ReplyOut[]
  created_at: string
  updated_at: string
}
