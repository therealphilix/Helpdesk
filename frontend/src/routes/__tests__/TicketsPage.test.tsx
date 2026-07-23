import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
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

function withTotal(data: unknown[], total?: number): { items: unknown[]; total: number } {
  return { items: data, total: total ?? data.length }
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
    mockUseQuery({ data: withTotal([]) });
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
    mockUseQuery({ data: withTotal(mockTickets) });
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
    mockUseQuery({ data: withTotal(mockTickets) });
  });

  it("renders for agent user without redirecting", () => {
    render(<TicketsPage />);
    expect(screen.getByRole("link", { name: "Tickets" })).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});

const defaultQueryKey = {
  category: "",
  limit: 10,
  offset: 0,
  search: "",
  sort_by: "created_at",
  sort_dir: "desc",
  status: "",
};

describe("TicketsTable sorting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ data: withTotal(mockTickets) });
  });

  it("sends default sort params to the API", () => {
    render(<TicketsPage />);
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["tickets", defaultQueryKey] })
    );
  });

  it("toggles sort direction when clicking a column header", async () => {
    render(<TicketsPage />);
    const statusHeader = screen.getByRole("columnheader", { name: /Status/ });
    await userEvent.click(statusHeader);
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["tickets", { ...defaultQueryKey, sort_by: "status", sort_dir: "asc" }],
      })
    );
  });

  it("toggles to descending on second click of the same header", async () => {
    render(<TicketsPage />);
    const statusHeader = screen.getByRole("columnheader", { name: /Status/ });
    await userEvent.click(statusHeader);
    await userEvent.click(statusHeader);
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["tickets", { ...defaultQueryKey, sort_by: "status", sort_dir: "desc" }],
      })
    );
  });
});

describe("TicketsTable filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ data: withTotal(mockTickets) });
  });

  it("renders search input, status select, and category select", () => {
    render(<TicketsPage />);
    expect(screen.getByRole("textbox", { name: /Search/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Status/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Category/ })).toBeInTheDocument();
  });

  async function selectOption(trigger: HTMLElement, optionText: string) {
    await userEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: optionText })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("option", { name: optionText }));
  }

  it("passes status filter to the API", async () => {
    render(<TicketsPage />);
    const statusTrigger = screen.getByRole("combobox", { name: /Status/ });
    await selectOption(statusTrigger, "Resolved");
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["tickets", { ...defaultQueryKey, sort_by: "created_at", sort_dir: "desc", status: "resolved" }],
      })
    );
  });

  it("passes category filter to the API", async () => {
    render(<TicketsPage />);
    const categoryTrigger = screen.getByRole("combobox", { name: /Category/ });
    await selectOption(categoryTrigger, "Refund");
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["tickets", { ...defaultQueryKey, sort_by: "created_at", sort_dir: "desc", category: "refund request" }],
      })
    );
  });

  it("shows Clear button when a filter is active", async () => {
    render(<TicketsPage />);
    const statusTrigger = screen.getByRole("combobox", { name: /Status/ });
    await selectOption(statusTrigger, "Open");
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("clears all filters when Clear is clicked", async () => {
    render(<TicketsPage />);
    const statusTrigger = screen.getByRole("combobox", { name: /Status/ });
    await selectOption(statusTrigger, "Resolved");
    const clearButton = screen.getByRole("button", { name: "Clear" });
    await userEvent.click(clearButton);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    });
    expect(statusTrigger).toHaveTextContent("All");
  });

  it("does not show Clear button when no filters are active", () => {
    render(<TicketsPage />);
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });
});
