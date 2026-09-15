import DOMPurify from "dompurify"
import { useMutation } from "@tanstack/react-query"
import { Loader2, Sparkles, Mail, Clock } from "lucide-react"
import type { Ticket } from "../lib/tickets"
import { apiClient } from "../api/client"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function statusStampClass(status: string): string {
  if (status === "open") return "stamp stamp-open"
  if (status === "resolved") return "stamp stamp-resolved"
  return "stamp stamp-closed"
}

export function TicketDetail({ ticket }: { ticket: Ticket }) {
  const summarize = useMutation({
    mutationFn: () =>
      apiClient.post(`/tickets/${ticket.id}/summarize`).then((res) => res.data),
  })

  return (
    <div className="paper-sheet rounded-xl overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary opacity-70" />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Correspondence #{ticket.id.slice(0, 8)}</p>
            <h2 className="text-xl font-semibold leading-tight mt-1 break-words" style={{ fontFamily: "var(--font-display)" }}>
              {ticket.subject}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3" />
                {ticket.sender_name ? (
                  <>
                    <span className="font-medium text-foreground">{ticket.sender_name}</span>
                    <span>&lt;{ticket.sender_email}&gt;</span>
                  </>
                ) : (
                  <span className="font-medium text-foreground">{ticket.sender_email}</span>
                )}
              </span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1" style={{ fontFamily: "var(--font-mono)" }}>
                <Clock className="size-3" /> {formatDate(ticket.created_at)}
              </span>
            </div>
          </div>
          <span className={`${statusStampClass(ticket.status)} animate-stamp-in shrink-0`}>{ticket.status}</span>
        </div>

        <div className="brass-rule my-5" />

        <h3 className="eyebrow mb-2">Message Body</h3>
        {ticket.body_html ? (
          <div
            className="prose prose-sm max-w-none rounded-lg border border-dashed border-border p-4 bg-muted/20 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.body_html) }}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 bg-muted/20 whitespace-pre-wrap text-sm leading-relaxed">
            {ticket.body_text}
          </div>
        )}

        <div className="flex justify-end mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => summarize.mutate()}
            disabled={summarize.isPending}
            className="rounded-full"
          >
            {summarize.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Summarizing...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Summarize with AI
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
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/40 p-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
            <h4 className="eyebrow !text-accent-foreground">Clerk’s summary</h4>
            <p className="text-sm whitespace-pre-wrap mt-2 leading-relaxed">{summarize.data.summary}</p>
          </div>
        )}
      </div>
    </div>
  )
}
