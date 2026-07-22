import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TicketsPage } from "../TicketsPage";

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  Link: ({ to, children, ...props }: any) =>
    <a href={to} {...props}>{children}</a>,
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => useQueryMock(...args),
  };
});

import { useAuth } from "../../contexts/AuthContext";
import { UserRole } from "../../lib/roles";

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
  });
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
  });
}

function mockUseQuery(overrides: Record<string, unknown>) {
  useQueryMock.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

describe("TicketsPage rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({});
  });

  it("renders the Navbar", () => {
    render(<TicketsPage />);
    expect(screen.getByText("Helpdesk")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  });

  it("renders the Tickets link in the navbar", () => {
    render(<TicketsPage />);
    expect(screen.getByRole("link", { name: "Tickets" })).toBeInTheDocument();
  });

  it("renders the page title and description", () => {
    render(<TicketsPage />);
    const card = screen.getByText("View and manage support tickets.").closest("[data-slot='card']") as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(within(card).getByText("Tickets")).toBeInTheDocument();
  });
});

describe("TicketsTable loading state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ isLoading: true });
  });

  it("renders skeleton rows while loading", () => {
    render(<TicketsPage />);
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBe(30);
  });

  it("renders column headers while loading", () => {
    render(<TicketsPage />);
    expect(screen.getByRole("columnheader", { name: "Sender" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Subject" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Assigned To" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Created" })).toBeInTheDocument();
  });
});

describe("TicketsTable error state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ isError: true, error: new Error("Network Error") });
  });

  it("shows an error alert when the request fails", () => {
    render(<TicketsPage />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Network Error");
  });

  it("shows a fallback message when error has no message", () => {
    mockUseQuery({ isError: true, error: null });
    render(<TicketsPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load tickets.");
  });
});

describe("TicketsTable empty state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ data: [] });
  });

  it("shows 'No tickets found.' when the ticket list is empty", () => {
    render(<TicketsPage />);
    expect(screen.getByText("No tickets found.")).toBeInTheDocument();
  });

  it("renders a single body row when empty", () => {
    render(<TicketsPage />);
    const table = screen.getByRole("table");
    const [, bodyGroup] = within(table).getAllByRole("rowgroup");
    const bodyRows = within(bodyGroup).getAllByRole("row");
    expect(bodyRows).toHaveLength(1);
  });
});

const mockTickets = [
  {
    id: "ticket-1",
    sender_email: "alice.student@university.edu",
    sender_name: "Alice Student",
    subject: "Cannot access course materials",
    status: "open" as const,
    category: "technical question",
    assigned_to: "user-1",
    assignee_name: "Test Admin",
    created_at: "2025-07-20T10:00:00Z",
  },
  {
    id: "ticket-2",
    sender_email: "bob.student@university.edu",
    sender_name: null,
    subject: "Refund request for tuition",
    status: "resolved" as const,
    category: null,
    assigned_to: null,
    assignee_name: null,
    created_at: "2025-07-19T08:00:00Z",
  },
];

describe("TicketsTable data state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ data: mockTickets });
  });

  it("renders all tickets in the table", () => {
    render(<TicketsPage />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Alice Student")).toBeInTheDocument();
    expect(within(table).getByText("Cannot access course materials")).toBeInTheDocument();
    expect(within(table).getByText("Refund request for tuition")).toBeInTheDocument();
  });

  it("shows sender email when sender_name is null", () => {
    render(<TicketsPage />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("bob.student@university.edu")).toBeInTheDocument();
  });

  it("renders correct number of data rows", () => {
    render(<TicketsPage />);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    const dataRows = rows.slice(1);
    expect(dataRows).toHaveLength(2);
  });

  it("renders status badges", () => {
    render(<TicketsPage />);
    const badges = document.querySelectorAll("[data-slot='badge']");
    const statusBadges = Array.from(badges).filter(
      (b) => b.textContent === "open" || b.textContent === "resolved"
    );
    expect(statusBadges).toHaveLength(2);
  });

  it("renders category badge when present and mdash when null", () => {
    render(<TicketsPage />);
    const badges = document.querySelectorAll("[data-slot='badge']");
    const categoryBadges = Array.from(badges).filter(
      (b) => b.textContent === "technical question"
    );
    expect(categoryBadges).toHaveLength(1);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders assignee name when assigned, Unassigned when not", () => {
    render(<TicketsPage />);
    expect(screen.getByText("Test Admin")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("renders a date in each ticket row", () => {
    render(<TicketsPage />);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    const firstDataRow = rows[1];
    const cells = within(firstDataRow).getAllByRole("cell");
    const dateCell = cells[5];
    expect(dateCell.textContent).toBeTruthy();
    expect(dateCell.textContent).toMatch(/\d/);
  });
});

describe("TicketsPage redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when user is null", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(<TicketsPage />);
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/login",
      replace: true,
    });
  });
});

describe("TicketsPage agent access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAgentUser();
    mockUseQuery({ data: mockTickets });
  });

  it("renders for agent user without redirecting", () => {
    render(<TicketsPage />);
    expect(screen.getByRole("link", { name: "Tickets" })).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
