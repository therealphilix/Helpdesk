import type { Ticket } from "../lib/tickets"
import { statusVariant } from "../lib/tickets"
import DOMPurify from "dompurify"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function TicketDetail({ ticket }: { ticket: Ticket }) {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="break-words">{ticket.subject}</CardTitle>
            <CardDescription className="mt-1">
              {ticket.sender_name ? (
                <>
                  {ticket.sender_name}{" "}
                  <span className="text-muted-foreground">
                    &lt;{ticket.sender_email}&gt;
                  </span>
                </>
              ) : (
                ticket.sender_email
              )}
              <span className="text-muted-foreground"> &middot; {formatDate(ticket.created_at)}</span>
            </CardDescription>
          </div>
          <Badge variant={statusVariant[ticket.status] || "secondary"}>
            {ticket.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Message Body
        </h3>
        {ticket.body_html ? (
          <div
            className="prose prose-sm max-w-none border rounded-lg p-4 bg-muted/30"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.body_html) }}
          />
        ) : (
          <div className="border rounded-lg p-4 bg-muted/30 whitespace-pre-wrap text-sm">
            {ticket.body_text}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
