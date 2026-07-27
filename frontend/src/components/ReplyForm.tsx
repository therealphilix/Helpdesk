import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Send } from "lucide-react"
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

  const handleSubmitReply = () => {
    const trimmed = replyText.trim()
    if (!trimmed || createReply.isPending) return
    createReply.mutate({ body_text: trimmed })
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
      <div className="flex justify-end mt-2">
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
    </div>
  )
}
