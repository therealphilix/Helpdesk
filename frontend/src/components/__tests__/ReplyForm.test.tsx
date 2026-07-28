import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
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
    let callIndex = 0
    useMutationMock.mockImplementation(() => {
      callIndex++
      if (callIndex % 2 === 1) {
        return {
          mutate: mutateMock,
          isPending: false,
          isError: true,
          error: new Error("Something went wrong"),
        }
      }
      return { mutate: vi.fn(), isPending: false, isError: false, error: null }
    })
    render(<ReplyForm ticket={mockTicket} />)
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
  })

  it("shows fallback error message when error has no message", () => {
    let callIndex = 0
    useMutationMock.mockImplementation(() => {
      callIndex++
      if (callIndex % 2 === 1) {
        return { mutate: vi.fn(), isPending: false, isError: true, error: null }
      }
      return { mutate: vi.fn(), isPending: false, isError: false, error: null }
    })
    render(<ReplyForm ticket={mockTicket} />)
    expect(screen.getByText("Failed to send reply.")).toBeInTheDocument()
  })

  describe("Polish button", () => {
    function mockPolishOnly(overrides: Record<string, unknown> = {}) {
      useMutationMock.mockImplementation((config: any) => {
        const isPolish = String(config.mutationFn ?? "").includes("polish")
        if (isPolish) {
          return { mutate: vi.fn(), isPending: false, isError: false, error: null, ...overrides }
        }
        return { mutate: vi.fn(), isPending: false, isError: false, error: null }
      })
    }

    it("renders Polish button", () => {
      render(<ReplyForm ticket={mockTicket} />)
      expect(screen.getByRole("button", { name: /polish/i })).toBeInTheDocument()
    })

    it("Polish button is disabled when textarea is empty", () => {
      render(<ReplyForm ticket={mockTicket} />)
      expect(screen.getByRole("button", { name: /polish/i })).toBeDisabled()
    })

    it("Polish button is enabled when textarea has text", async () => {
      render(<ReplyForm ticket={mockTicket} />)
      await userEvent.type(
        screen.getByPlaceholderText("Type your reply..."),
        "Hello"
      )
      expect(screen.getByRole("button", { name: /polish/i })).not.toBeDisabled()
    })

    it("shows loading spinner while polishing", () => {
      mockPolishOnly({ isPending: true })
      render(<ReplyForm ticket={mockTicket} />)
      expect(screen.getByText(/polishing/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /polishing/i })).toBeDisabled()
    })

    it("calls polish mutate with draft on click", async () => {
      const polishMutateMock = vi.fn()
      mockPolishOnly({ mutate: polishMutateMock })

      render(<ReplyForm ticket={mockTicket} />)
      const textarea = screen.getByPlaceholderText("Type your reply...")
      await userEvent.type(textarea, "  rough draft  ")
      await userEvent.click(screen.getByRole("button", { name: /polish/i }))
      expect(polishMutateMock).toHaveBeenCalledWith({ draft: "rough draft" })
    })

    it("replaces replyText with polished result on success", async () => {
      let polishOnSuccess: ((data: unknown) => void) | undefined
      useMutationMock.mockImplementation((config: any) => {
        const isPolish = String(config.mutationFn ?? "").includes("polish")
        if (isPolish) {
          polishOnSuccess = config.onSuccess
          return { mutate: vi.fn(), isPending: false, isError: false, error: null }
        }
        return { mutate: vi.fn(), isPending: false, isError: false, error: null }
      })

      render(<ReplyForm ticket={mockTicket} />)
      const textarea = screen.getByPlaceholderText(
        "Type your reply..."
      ) as HTMLTextAreaElement
      await userEvent.type(textarea, "rough draft")

      expect(polishOnSuccess).toBeDefined()
      await act(() => {
        polishOnSuccess!({ data: { polished: "Polished version." } })
      })
      expect(textarea.value).toBe("Polished version.")
    })

    it("shows error message when polish fails", () => {
      mockPolishOnly({ isError: true, error: new Error("API error") })
      render(<ReplyForm ticket={mockTicket} />)
      expect(screen.getByText("API error")).toBeInTheDocument()
    })

    it("shows fallback error message when polish error has no message", () => {
      mockPolishOnly({ isError: true, error: null })
      render(<ReplyForm ticket={mockTicket} />)
      expect(screen.getByText("Failed to polish reply.")).toBeInTheDocument()
    })

    it("does not call polish when textarea is only whitespace", async () => {
      const polishMutateMock = vi.fn()
      mockPolishOnly({ mutate: polishMutateMock })

      render(<ReplyForm ticket={mockTicket} />)
      await userEvent.type(
        screen.getByPlaceholderText("Type your reply..."),
        "   "
      )
      await userEvent.click(screen.getByRole("button", { name: /polish/i }))
      expect(polishMutateMock).not.toHaveBeenCalled()
    })
  })
})
