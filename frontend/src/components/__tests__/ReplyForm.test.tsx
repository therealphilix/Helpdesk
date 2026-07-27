import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ReplyForm } from "../ReplyForm"

const { useMutationMock, useQueryClientMock, invalidateQueriesMock } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
}))

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query")
  return {
    ...actual,
    useMutation: (...args: unknown[]) => useMutationMock(...args),
    useQueryClient: () => useQueryClientMock(),
  }
})

const mockTicket = { id: "ticket-1" }

describe("ReplyForm", () => {
  let mutateMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
    })
    mutateMock = vi.fn()
    useMutationMock.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
      isError: false,
      error: null,
    })
  })

  it("renders the Add Reply heading", () => {
    render(<ReplyForm ticket={mockTicket} />)
    expect(screen.getByText("Add Reply")).toBeInTheDocument()
  })

  it("renders textarea with placeholder", () => {
    render(<ReplyForm ticket={mockTicket} />)
    expect(screen.getByPlaceholderText("Type your reply...")).toBeInTheDocument()
  })

  it("renders Send button", () => {
    render(<ReplyForm ticket={mockTicket} />)
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument()
  })

  it("Send button is disabled when textarea is empty", () => {
    render(<ReplyForm ticket={mockTicket} />)
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled()
  })

  it("Send button is enabled when textarea has text", async () => {
    render(<ReplyForm ticket={mockTicket} />)
    const textarea = screen.getByPlaceholderText("Type your reply...")
    await userEvent.type(textarea, "Hello")
    expect(screen.getByRole("button", { name: /send/i })).not.toBeDisabled()
  })

  it("disables textarea and button while mutation is pending", () => {
    useMutationMock.mockReturnValue({
      mutate: mutateMock,
      isPending: true,
      isError: false,
      error: null,
    })
    render(<ReplyForm ticket={mockTicket} />)
    expect(screen.getByPlaceholderText("Type your reply...")).toBeDisabled()
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled()
  })

  it("calls mutate with trimmed text on submit", async () => {
    render(<ReplyForm ticket={mockTicket} />)
    const textarea = screen.getByPlaceholderText("Type your reply...")
    await userEvent.type(textarea, "  Helping now.  ")
    await userEvent.click(screen.getByRole("button", { name: /send/i }))
    expect(mutateMock).toHaveBeenCalledWith({ body_text: "Helping now." })
  })

  it("does not submit when textarea is only whitespace", async () => {
    render(<ReplyForm ticket={mockTicket} />)
    const textarea = screen.getByPlaceholderText("Type your reply...")
    await userEvent.type(textarea, "   ")
    await userEvent.click(screen.getByRole("button", { name: /send/i }))
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it("invalidates queries on mutation success", () => {
    render(<ReplyForm ticket={mockTicket} />)
    const onSuccess = useMutationMock.mock.calls[0]?.[0]?.onSuccess
    expect(onSuccess).toBeDefined()
    onSuccess()
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ["ticket", "ticket-1"],
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ["replies", "ticket-1"],
    })
  })

  it("shows error message when mutation errors", () => {
    useMutationMock.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
      isError: true,
      error: new Error("Something went wrong"),
    })
    render(<ReplyForm ticket={mockTicket} />)
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
  })

  it("shows fallback error message when error has no message", () => {
    useMutationMock.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
      isError: true,
      error: null,
    })
    render(<ReplyForm ticket={mockTicket} />)
    expect(screen.getByText("Failed to send reply.")).toBeInTheDocument()
  })
})
