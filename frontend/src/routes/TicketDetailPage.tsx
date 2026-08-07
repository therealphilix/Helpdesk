import { useNavigate, useParams } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { type AxiosError } from "axios"
import { useAuth } from "../contexts/AuthContext"
import { AppLayout } from "../components/AppLayout"
import { BackLink } from "../components/BackLink"
import { ReplyThread } from "../components/ReplyThread"
import { ReplyForm } from "../components/ReplyForm"
import { TicketDetail } from "../components/TicketDetail"
import { UpdateTicket } from "../components/UpdateTicket"
import { TicketDetailSkeleton } from "../components/TicketDetailSkeleton"
import { apiClient } from "../api/client"
import type { Ticket } from "../lib/tickets"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Agent {
  id: string
  name: string
  email: string
}

export function TicketDetailPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { ticketId } = useParams({ from: "/tickets/$ticketId" })

  const { data: ticket, isLoading, isError, error } = useQuery<Ticket>({
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
    <AppLayout>
      <BackLink to="/tickets">Back to tickets</BackLink>

        {isLoading && <TicketDetailSkeleton />}

        {isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load ticket."}
            </AlertDescription>
          </Alert>
        )}

        {ticket && (
          <div>
            <TicketDetail ticket={ticket} />

            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:flex-1 min-w-0">
                <ReplyThread ticket={ticket} />
                <ReplyForm ticket={ticket} />
              </div>

              <div className="md:w-64">
                <UpdateTicket
                  ticket={ticket}
                  agents={agents}
                  isPending={updateTicket.isPending}
                  onUpdate={(data) => updateTicket.mutate(data)}
                />
              </div>
            </div>
          </div>
        )}
    </AppLayout>
  )
}
