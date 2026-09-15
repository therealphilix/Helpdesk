import { Loader2, Paperclip } from "lucide-react"
import type { Ticket } from "../lib/tickets"
import { statusOptions, categoryOptions } from "../lib/tickets"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Agent {
  id: string
  name: string
}

interface UpdateTicketProps {
  ticket: Ticket
  agents: Agent[]
  isPending: boolean
  onUpdate: (data: Record<string, unknown>) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <div>{children}</div>
    </div>
  )
}

export function UpdateTicket({ ticket, agents, isPending, onUpdate }: UpdateTicketProps) {
  return (
    <Card className="paper-sheet perforated-top gap-0 py-0 overflow-hidden sticky top-8">
      <CardHeader className="flex flex-row items-center gap-2 py-4 border-b border-dashed border-border bg-muted/20">
        <Paperclip className="size-4 text-accent -rotate-12" />
        <CardTitle className="text-xs uppercase tracking-[0.12em] font-semibold" style={{ fontFamily: "var(--font-mono)" }}>Routing slip</CardTitle>
        <span className="ml-auto text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>#{ticket.id.slice(0, 6).toUpperCase()}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-5">
        <DetailRow label="Status">
          <div className="flex items-center gap-2">
            <Select
              value={ticket.status}
              onValueChange={(val) => onUpdate({ status: val })}
              disabled={isPending}
            >
              <SelectTrigger className="w-full bg-background" aria-label="Status">
                <SelectValue>
                  {(val: string) => {
                    const option = statusOptions.find((o) => o.value === val)
                    return option ? option.label : val
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </DetailRow>
        <DetailRow label="Category">
          <div className="flex items-center gap-2">
            <Select
              value={ticket.category ?? "none"}
              onValueChange={(val) =>
                onUpdate({ category: val === "none" ? null : val })
              }
              disabled={isPending}
            >
              <SelectTrigger className="w-full bg-background" aria-label="Category">
                <SelectValue>
                  {(val: string) => {
                    if (!val || val === "none") return "None"
                    const option = categoryOptions.find((o) => o.value === val)
                    return option ? option.label : val
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </DetailRow>
        <DetailRow label="Assignee">
          <div className="flex items-center gap-2">
            <Select
              value={ticket.assigned_to ?? "unassigned"}
              onValueChange={(val) =>
                onUpdate({ assigned_to: val === "unassigned" ? null : val })
              }
              disabled={isPending}
            >
              <SelectTrigger className="w-full bg-background" aria-label="Assigned To">
                <SelectValue>
                  {(val: string) => {
                    if (!val || val === "unassigned") return "Unassigned"
                    const agent = agents.find((a) => a.id === val)
                    return agent ? agent.name : "Unassigned"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </DetailRow>
        <div className="brass-rule my-1" />
        <DetailRow label="Created">
          <span className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>{formatDate(ticket.created_at)}</span>
        </DetailRow>
        <DetailRow label="Updated">
          <span className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>{formatDate(ticket.updated_at)}</span>
        </DetailRow>
      </CardContent>
    </Card>
  )
}
