import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Send, Wand2 } from "lucide-react"
import type { Ticket } from "../lib/tickets"
import { apiClient } from "../api/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function ReplyForm({ ticket }: { ticket: Pick<Ticket, "id"> }) {
  const queryClient = useQueryClient()
  const [replyText, setReplyText] = useState("")

  const createReply = useMutation({
    mutationFn: (data: { body_text: string }) =>
      apiClient.post(`/tickets/${ticket.id}/replies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] })
      queryClient.invalidateQueries({ queryKey: ["replies", ticket.id] })
      setReplyText("")
    },
  })

  const polishReply = useMutation({
    mutationFn: (data: { draft: string }) =>
      apiClient.post(`/tickets/${ticket.id}/replies/polish`, data),
    onSuccess: (res) => {
      setReplyText(res.data.polished)
    },
  })

  const handleSubmitReply = () => {
    const trimmed = replyText.trim()
    if (!trimmed || createReply.isPending) return
    createReply.mutate({ body_text: trimmed })
  }

  const handlePolish = () => {
    const trimmed = replyText.trim()
    if (!trimmed || polishReply.isPending) return
    polishReply.mutate({ draft: trimmed })
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        Add Reply
      </h3>
      <Textarea
        placeholder="Type your reply..."
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSubmitReply()
          }
        }}
        disabled={createReply.isPending}
        rows={4}
      />
      <div className="flex justify-between mt-2">
        <Button
          variant="outline"
          onClick={handlePolish}
          disabled={polishReply.isPending || !replyText.trim()}
        >
          {polishReply.isPending ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Polishing...
            </>
          ) : (
            <>
              <Wand2 className="mr-1.5 h-4 w-4" />
              Polish
            </>
          )}
        </Button>
        <Button
          onClick={handleSubmitReply}
          disabled={createReply.isPending || !replyText.trim()}
        >
          {createReply.isPending && (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          )}
          <Send className="mr-1.5 h-4 w-4" />
          Send
        </Button>
      </div>
      {createReply.isError && (
        <p className="text-sm text-destructive mt-1">
          {createReply.error instanceof Error
            ? createReply.error.message
            : "Failed to send reply."}
        </p>
      )}
      {polishReply.isError && (
        <p className="text-sm text-destructive mt-1">
          {polishReply.error instanceof Error
            ? polishReply.error.message
            : "Failed to polish reply."}
        </p>
      )}
    </div>
  )
}
