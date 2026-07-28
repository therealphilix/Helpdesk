import DOMPurify from "dompurify"
import { useMutation } from "@tanstack/react-query"
import { Loader2, Sparkles } from "lucide-react"
import type { Ticket } from "../lib/tickets"
import { statusVariant } from "../lib/tickets"
import { apiClient } from "../api/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function TicketDetail({ ticket }: { ticket: Ticket }) {
  const summarize = useMutation({
    mutationFn: () =>
      apiClient.post(`/tickets/${ticket.id}/summarize`).then((res) => res.data),
  })

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

        <div className="flex justify-end mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => summarize.mutate()}
            disabled={summarize.isPending}
          >
            {summarize.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Summarizing...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Summarize
              </>
            )}
          </Button>
        </div>

        {summarize.isError && (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>
              {summarize.error instanceof Error
                ? summarize.error.message
                : "Failed to generate summary."}
            </AlertDescription>
          </Alert>
        )}

        {summarize.data?.summary && (
          <div className="mt-3 border rounded-lg p-4 bg-muted/30">
            <h4 className="text-sm font-semibold mb-2">Summary</h4>
            <p className="text-sm whitespace-pre-wrap">{summarize.data.summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
