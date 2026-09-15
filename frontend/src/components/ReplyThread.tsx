import type { Ticket } from "../lib/tickets"
import DOMPurify from "dompurify"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function ReplyThread({ ticket }: { ticket: Pick<Ticket, "replies" | "sender_name" | "sender_email"> }) {
  const { replies, sender_name, sender_email } = ticket
  if (replies.length === 0) return null

  return (
    <div className="mt-6">
      <p className="eyebrow mb-3">Thread — {replies.length} {replies.length === 1 ? "reply" : "replies"}</p>
      <div className="space-y-3">
        {replies.map((reply) => {
          const isCustomer = reply.sender_type === "customer"
          const name = isCustomer ? (sender_name ?? sender_email) : (reply.author_name ?? "Agent")
          const initial = (name?.[0] ?? "?").toUpperCase()
          return (
            <div
              key={reply.id}
              className={`rounded-xl border p-4 ${isCustomer ? "paper-sheet" : "bg-card border-border border-l-[3px] border-l-accent"}`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold border ${isCustomer ? "bg-muted border-border text-muted-foreground" : "bg-accent/15 border-accent/30 text-accent-foreground"}`}>
                  {initial}
                </span>
                <span className="text-sm font-medium">{name}</span>
                <span className={`stamp !py-1 !px-1.5 !text-[9px] !rotate-0 ${isCustomer ? "stamp-category" : "stamp-resolved"}`}>
                  {isCustomer ? "Student" : "Staff"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto" style={{ fontFamily: "var(--font-mono)" }}>
                  {formatDate(reply.created_at)}
                </span>
              </div>
              {reply.body_html ? (
                <div
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reply.body_html) }}
                />
              ) : (
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {reply.body_text}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
