import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReplyThread } from "../ReplyThread"

const mockTicket = {
  sender_name: "Alice Student",
  sender_email: "alice@test.com",
  replies: [
    {
      id: "reply-1",
      ticket_id: "ticket-1",
      sender_type: "agent" as const,
      author_id: "user-1",
      author_name: "Jane Agent",
      body_text: "I'll look into this.",
      created_at: "2025-07-20T11:00:00Z",
    },
    {
      id: "reply-2",
      ticket_id: "ticket-1",
      sender_type: "customer" as const,
      author_id: null,
      author_name: null,
      body_text: "Thank you!",
      created_at: "2025-07-20T11:30:00Z",
    },
  ],
}

describe("ReplyThread", () => {
  it("renders nothing when there are no replies", () => {
    const { container } = render(
      <ReplyThread ticket={{ ...mockTicket, replies: [] }} />
    )
    expect(container.textContent).toBe("")
  })

  it("renders the Replies heading", () => {
    render(<ReplyThread ticket={mockTicket} />)
    expect(screen.getByText("Replies")).toBeInTheDocument()
  })

  it("renders all reply body texts", () => {
    render(<ReplyThread ticket={mockTicket} />)
    expect(screen.getByText("I'll look into this.")).toBeInTheDocument()
    expect(screen.getByText("Thank you!")).toBeInTheDocument()
  })

  it("shows author name for agent replies", () => {
    render(<ReplyThread ticket={mockTicket} />)
    expect(screen.getByText("Jane Agent")).toBeInTheDocument()
  })

  it('shows "Agent" when agent reply has no author_name', () => {
    const ticket = {
      ...mockTicket,
      replies: [{ ...mockTicket.replies[0], author_name: null }],
    }
    render(<ReplyThread ticket={ticket} />)
    expect(screen.getByText("Agent")).toBeInTheDocument()
  })

  it("shows sender name for customer replies", () => {
    render(<ReplyThread ticket={mockTicket} />)
    const nameElements = screen.getAllByText("Alice Student")
    expect(nameElements.length).toBeGreaterThanOrEqual(1)
  })

  it("falls back to sender email for customer reply when sender_name is null", () => {
    const ticket = { ...mockTicket, sender_name: null }
    render(<ReplyThread ticket={ticket} />)
    expect(screen.getByText("alice@test.com")).toBeInTheDocument()
  })

  it("renders timestamps", () => {
    render(<ReplyThread ticket={mockTicket} />)
    const dateElements = document.querySelectorAll(".text-xs.text-muted-foreground")
    expect(dateElements.length).toBe(2)
    expect(dateElements[0].textContent).toContain("2025")
  })
})
