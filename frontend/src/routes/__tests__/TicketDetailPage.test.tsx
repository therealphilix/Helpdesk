import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { TicketDetailPage } from "../TicketDetailPage"

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ ticketId: "ticket-1" }),
  Link: ({ to, children, ...props }: any) =>
    <a href={to} {...props}>{children}</a>,
}))

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}))

const { useQueryMock, useMutationMock, queryClientInvalidateMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  queryClientInvalidateMock: vi.fn(),
}))

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query")
  return {
    ...actual,
    useQuery: (...args: unknown[]) => useQueryMock(...args),
    useMutation: (...args: unknown[]) => useMutationMock(...args),
    useQueryClient: () => ({ invalidateQueries: queryClientInvalidateMock }),
  }
})

import { useAuth } from "../../contexts/AuthContext"
import { UserRole } from "../../lib/roles"

function setAdminUser() {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: "admin-1",
      email: "admin@helpdesk.com",
      name: "Test Admin",
      role: UserRole.ADMIN,
      created_at: "2025-01-01T00:00:00Z",
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  })
}

function setAgentUser() {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: "agent-1",
      email: "agent@helpdesk.com",
      name: "Test Agent",
      role: UserRole.AGENT,
      created_at: "2025-01-01T00:00:00Z",
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  })
}

const queryDefaults = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
}

const mockTicket = {
  id: "ticket-1",
  sender_email: "alice.student@university.edu",
  sender_name: "Alice Student",
  subject: "Cannot access course materials",
  body_text: "Hello, I cannot access the course materials for CS101.",
  body_html: null,
  status: "open" as const,
  category: "technical question",
  assigned_to: "user-1",
  assignee_name: "Test Admin",
  created_at: "2025-07-20T10:00:00Z",
  updated_at: "2025-07-20T12:00:00Z",
}

const mockAgents = [
  { id: "user-1", name: "Test Admin", email: "admin@helpdesk.com" },
  { id: "agent-2", name: "Jane Agent", email: "jane@helpdesk.com" },
]

function mockQueries(ticketOverrides: Record<string, unknown> = {}, agentsOverrides: Record<string, unknown> = {}) {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    if (Array.isArray(queryKey) && queryKey[0] === "agents") {
      return { ...queryDefaults, data: mockAgents, ...agentsOverrides }
    }
    return { ...queryDefaults, data: mockTicket, ...ticketOverrides }
  })
}

describe("TicketDetailPage rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setAdminUser()
    mockQueries()
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false })
  })

  it("renders the Navbar", () => {
    render(<TicketDetailPage />)
    expect(screen.getByText("Helpdesk")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument()
  })

  it("renders a Back to tickets button", () => {
    render(<TicketDetailPage />)
    expect(screen.getByRole("button", { name: /back to tickets/i })).toBeInTheDocument()
  })

  it("navigates to /tickets when Back button is clicked", async () => {
    render(<TicketDetailPage />)
    await userEvent.click(screen.getByRole("button", { name: /back to tickets/i }))
    expect(navigateMock).toHaveBeenCalledWith({ to: "/tickets" })
  })

  it("renders the ticket subject as the card title", () => {
    render(<TicketDetailPage />)
    expect(screen.getByText("Cannot access course materials")).toBeInTheDocument()
  })

  it("renders sender name and email", () => {
    render(<TicketDetailPage />)
    expect(screen.getByText("Alice Student")).toBeInTheDocument()
    expect(screen.getByText(/alice.student@university.edu/)).toBeInTheDocument()
  })

  it("renders sender email when sender_name is null", () => {
    mockQueries({ data: { ...mockTicket, sender_name: null } })
    render(<TicketDetailPage />)
    expect(screen.getByText("alice.student@university.edu")).toBeInTheDocument()
  })

  it("renders the status badge in the header", () => {
    render(<TicketDetailPage />)
    const badge = screen.getByText("open")
    expect(badge).toBeInTheDocument()
    expect(badge.closest("[data-slot='badge']")).toBeInTheDocument()
  })

  it("renders the status select with current value", () => {
    render(<TicketDetailPage />)
    const trigger = screen.getByRole("combobox", { name: "Status" })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent("Open")
  })

  it("renders the category select with current value", () => {
    render(<TicketDetailPage />)
    const trigger = screen.getByRole("combobox", { name: "Category" })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent("Technical Question")
  })

  it("renders None in the category select when category is null", () => {
    mockQueries({ data: { ...mockTicket, category: null } })
    render(<TicketDetailPage />)
    const trigger = screen.getByRole("combobox", { name: "Category" })
    expect(trigger).toHaveTextContent("None")
  })

  it("renders the assigned agent value in the select", () => {
    render(<TicketDetailPage />)
    const trigger = screen.getByRole("combobox", { name: "Assigned To" })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent("Test Admin")
  })

  it("renders Unassigned in the select when no assignee", () => {
    mockQueries({ data: { ...mockTicket, assigned_to: null, assignee_name: null } })
    render(<TicketDetailPage />)
    const trigger = screen.getByRole("combobox", { name: "Assigned To" })
    expect(trigger).toHaveTextContent("Unassigned")
  })

  it("renders created and updated dates", () => {
    render(<TicketDetailPage />)
    const dateElements = screen.getAllByText(/\d{1,4}[/\-.]\d{1,2}[/\-.]\d{2,4}/)
    expect(dateElements.length).toBeGreaterThanOrEqual(2)
  })

  it("renders the plain text body when body_html is null", () => {
    render(<TicketDetailPage />)
    expect(
      screen.getByText("Hello, I cannot access the course materials for CS101.")
    ).toBeInTheDocument()
  })

  it("renders HTML body when body_html is provided", () => {
    mockQueries({ data: { ...mockTicket, body_html: "<p>Hello <strong>world</strong></p>" } })
    render(<TicketDetailPage />)
    const el = document.querySelector("strong")
    expect(el).toBeInTheDocument()
    expect(el?.textContent).toBe("world")
  })
})

describe("TicketDetailPage loading state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setAdminUser()
    mockQueries({ isLoading: true })
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false })
  })

  it("renders skeleton placeholders while loading", () => {
    render(<TicketDetailPage />)
    const skeletons = document.querySelectorAll("[data-slot='skeleton']")
    expect(skeletons.length).toBe(6)
  })
})

describe("TicketDetailPage error state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setAdminUser()
    mockQueries({ isError: true, error: new Error("Ticket not found") })
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false })
  })

  it("shows an error alert when the request fails", () => {
    render(<TicketDetailPage />)
    const alert = screen.getByRole("alert")
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent("Ticket not found")
  })

  it("shows a fallback message when error has no message", () => {
    mockQueries({ isError: true, error: null })
    render(<TicketDetailPage />)
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load ticket.")
  })
})

describe("TicketDetailPage redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects to /login when user is null", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })
    render(<TicketDetailPage />)
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/login",
      replace: true,
    })
  })
})

describe("TicketDetailPage agent access", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setAgentUser()
    mockQueries()
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false })
  })

  it("renders for agent user without redirecting", () => {
    render(<TicketDetailPage />)
    expect(screen.getByRole("button", { name: /back to tickets/i })).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})

describe("TicketDetailPage mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setAdminUser()
    mockQueries()
  })

  async function selectOption(trigger: HTMLElement, optionText: string) {
    await userEvent.click(trigger)
    await waitFor(() => {
      expect(screen.getByRole("option", { name: optionText })).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole("option", { name: optionText }))
  }

  it("calls update mutation when changing status", async () => {
    const mutateMock = vi.fn()
    useMutationMock.mockReturnValue({ mutate: mutateMock, isPending: false })

    render(<TicketDetailPage />)
    const trigger = screen.getByRole("combobox", { name: "Status" })
    await selectOption(trigger, "Resolved")
    expect(mutateMock).toHaveBeenCalledWith({ status: "resolved" })
  })

  it("calls update mutation when changing category", async () => {
    const mutateMock = vi.fn()
    useMutationMock.mockReturnValue({ mutate: mutateMock, isPending: false })

    render(<TicketDetailPage />)
    const trigger = screen.getByRole("combobox", { name: "Category" })
    await selectOption(trigger, "Refund Request")
    expect(mutateMock).toHaveBeenCalledWith({ category: "refund request" })
  })

  it("calls update mutation with null when selecting None category", async () => {
    const mutateMock = vi.fn()
    useMutationMock.mockReturnValue({ mutate: mutateMock, isPending: false })

    mockQueries({ data: { ...mockTicket, category: "general question" } })
    render(<TicketDetailPage />)
    const trigger = screen.getByRole("combobox", { name: "Category" })
    await selectOption(trigger, "None")
    expect(mutateMock).toHaveBeenCalledWith({ category: null })
  })

  it("renders the assignee select with agent options", async () => {
    render(<TicketDetailPage />)
    const trigger = screen.getByRole("combobox", { name: "Assigned To" })
    await userEvent.click(trigger)
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Unassigned" })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: "Jane Agent" })).toBeInTheDocument()
    })
  })

  it("calls update mutation when selecting a different agent", async () => {
    const mutateMock = vi.fn()
    useMutationMock.mockReturnValue({ mutate: mutateMock, isPending: false })

    render(<TicketDetailPage />)
    const trigger = screen.getByRole("combobox", { name: "Assigned To" })
    await selectOption(trigger, "Jane Agent")
    expect(mutateMock).toHaveBeenCalledWith({ assigned_to: "agent-2" })
  })

  it("calls update mutation with null when selecting Unassigned", async () => {
    const mutateMock = vi.fn()
    useMutationMock.mockReturnValue({ mutate: mutateMock, isPending: false })

    mockQueries({ data: { ...mockTicket, assigned_to: "agent-2", assignee_name: "Jane Agent" } })
    render(<TicketDetailPage />)
    const trigger = screen.getByRole("combobox", { name: "Assigned To" })
    await selectOption(trigger, "Unassigned")
    expect(mutateMock).toHaveBeenCalledWith({ assigned_to: null })
  })

  it("disables selects while mutation is pending", () => {
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: true })
    render(<TicketDetailPage />)
    const triggers = screen.getAllByRole("combobox")
    for (const trigger of triggers) {
      expect(trigger).toBeDisabled()
    }
  })

  it("invalidates ticket query on mutation success", () => {
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false })
    render(<TicketDetailPage />)
    const onSuccess = useMutationMock.mock.calls[0]?.[0]?.onSuccess
    expect(onSuccess).toBeDefined()
    onSuccess()
    expect(queryClientInvalidateMock).toHaveBeenCalledWith({
      queryKey: ["ticket", "ticket-1"],
    })
  })
})
