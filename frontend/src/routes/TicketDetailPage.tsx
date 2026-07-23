import { useNavigate, useParams } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { type AxiosError } from "axios"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { Navbar } from "../components/Navbar"
import { apiClient } from "../api/client"
import {
  TicketStatus,
  TicketCategory,
  statusVariant,
  statusOptions,
  categoryOptions,
} from "../lib/tickets"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TicketDetail {
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
  created_at: string
  updated_at: string
}

interface Agent {
  id: string
  name: string
  email: string
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

export function TicketDetailPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { ticketId } = useParams({ from: "/tickets/$ticketId" })

  const { data: ticket, isLoading, isError, error } = useQuery<TicketDetail>({
    queryKey: ["ticket", ticketId],
    queryFn: () =>
      apiClient
        .get(`/tickets/${ticketId}`)
        .then((res) => res.data)
        .catch((err: AxiosError<{ detail: string }>) => {
          throw new Error(err.response?.data?.detail ?? "Failed to load ticket.")
        }),
  })

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: () => apiClient.get("/tickets/agents").then((res) => res.data),
  })

  const updateTicket = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`/tickets/${ticketId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
    },
  })

  if (!user) {
    navigate({ to: "/login", replace: true })
    return null
  }

  return (
    <div>
      <Navbar />
      <main className="p-6 max-w-6xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate({ to: "/tickets" })}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to tickets
        </Button>

        {isLoading && (
          <Card className="border-0 shadow-none">
            <CardHeader>
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-1/3 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-32 w-full mt-4" />
            </CardContent>
          </Card>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load ticket."}
            </AlertDescription>
          </Alert>
        )}

        {ticket && (
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
                  </CardDescription>
                </div>
                <Badge variant={statusVariant[ticket.status] || "secondary"}>
                  {ticket.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Message Body
                  </h3>
                  {ticket.body_html ? (
                    <div
                      className="prose prose-sm max-w-none border rounded-lg p-4 bg-muted/30"
                      dangerouslySetInnerHTML={{ __html: ticket.body_html }}
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-muted/30 whitespace-pre-wrap text-sm">
                      {ticket.body_text}
                    </div>
                  )}
                </div>

                <div className="md:w-64 flex flex-col gap-4">
                  <DetailRow label="Status">
                    <div className="flex items-center gap-2">
                      <Select
                        value={ticket.status}
                        onValueChange={(val) =>
                          updateTicket.mutate({ status: val })
                        }
                        disabled={updateTicket.isPending}
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
                      {updateTicket.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </DetailRow>
                  <DetailRow label="Category">
                    <div className="flex items-center gap-2">
                      <Select
                        value={ticket.category ?? "none"}
                        onValueChange={(val) =>
                          updateTicket.mutate({ category: val === "none" ? null : val })
                        }
                        disabled={updateTicket.isPending}
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
                      {updateTicket.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </DetailRow>
                  <DetailRow label="Assignee">
                    <div className="flex items-center gap-2">
                      <Select
                        value={ticket.assigned_to ?? "unassigned"}
                        onValueChange={(val) =>
                          updateTicket.mutate({ assigned_to: val === "unassigned" ? null : val })
                        }
                        disabled={updateTicket.isPending}
                      >
                        <SelectTrigger className="w-full" aria-label="Assigned To">
                          <SelectValue>
                            {(val: string) => {
                              if (!val || val === "unassigned") return "Unassigned"
                              const agent = agents.find((a) => a.id === val)
                              return agent ? agent.name : val
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
                      {updateTicket.isPending && (
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
