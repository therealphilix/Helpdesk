import type { Ticket } from "../lib/tickets"
import DOMPurify from "dompurify"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function ReplyThread({ ticket }: { ticket: Pick<Ticket, "replies" | "sender_name" | "sender_email"> }) {
  const { replies, sender_name, sender_email } = ticket
  if (replies.length === 0) return null

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Replies
      </h3>
      <div className="space-y-3">
        {replies.map((reply) => (
          <div
            key={reply.id}
            className="border rounded-lg p-3 bg-background"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-medium">
                {reply.sender_type === "customer"
                  ? (sender_name ?? sender_email)
                  : (reply.author_name ?? "Agent")}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(reply.created_at)}
              </span>
            </div>
            {reply.body_html ? (
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reply.body_html) }}
              />
            ) : (
              <div>
                {reply.body_text}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
