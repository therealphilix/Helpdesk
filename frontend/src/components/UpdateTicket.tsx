import { Loader2 } from "lucide-react"
import type { Ticket } from "../lib/tickets"
import { statusOptions, categoryOptions } from "../lib/tickets"
import { Card, CardContent } from "@/components/ui/card"
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
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  )
}

export function UpdateTicket({ ticket, agents, isPending, onUpdate }: UpdateTicketProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <DetailRow label="Status">
          <div className="flex items-center gap-2">
            <Select
              value={ticket.status}
              onValueChange={(val) => onUpdate({ status: val })}
              disabled={isPending}
            >
              <SelectTrigger className="w-full" aria-label="Status">
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
              <SelectTrigger className="w-full" aria-label="Category">
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
              <SelectTrigger className="w-full" aria-label="Assigned To">
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
        <DetailRow label="Created">
          <span className="text-sm">{formatDate(ticket.created_at)}</span>
        </DetailRow>
        <DetailRow label="Updated">
          <span className="text-sm">{formatDate(ticket.updated_at)}</span>
        </DetailRow>
      </CardContent>
    </Card>
  )
}
