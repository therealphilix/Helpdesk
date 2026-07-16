import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { UsersPage } from "../UsersPage";

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

function setAdminUser() {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: "admin-1",
      email: "myadmin@helpdesk.com",
      name: "My Admin",
      role: "admin",
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

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({});
  });

  it("renders the Navbar", () => {
    render(<UsersPage />);
    expect(screen.getByText("Helpdesk")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  });

  it("renders the page title and description", () => {
    render(<UsersPage />);
    const card = screen.getByText("Manage user accounts and their roles.").closest("[data-slot='card']") as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(within(card).getByText("Users")).toBeInTheDocument();
  });
});

describe("UserList loading state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ isLoading: true });
  });

  it("renders skeleton rows while loading", () => {
    render(<UsersPage />);
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBe(25);
  });

  it("renders column headers while loading", () => {
    render(<UsersPage />);
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Created" })).toBeInTheDocument();
  });
});

describe("UserList error state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ isError: true, error: new Error("Network Error") });
  });

  it("shows an error alert when the request fails", () => {
    render(<UsersPage />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Network Error");
  });

  it("shows a fallback message when error has no message", () => {
    mockUseQuery({ isError: true, error: null });
    render(<UsersPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load users.");
  });
});

describe("UserList empty state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ data: [] });
  });

  it("shows 'No users found.' when the user list is empty", () => {
    render(<UsersPage />);
    expect(screen.getByText("No users found.")).toBeInTheDocument();
  });

  it("renders a single body row when empty", () => {
    render(<UsersPage />);
    const table = screen.getByRole("table");
    const [, bodyGroup] = within(table).getAllByRole("rowgroup");
    const bodyRows = within(bodyGroup).getAllByRole("row");
    expect(bodyRows).toHaveLength(1);
  });
});

const mockUsers = [
  {
    id: "1",
    email: "admin@helpdesk.com",
    name: "Admin User",
    role: "admin",
    is_active: true,
    created_at: "2025-03-15T10:30:00Z",
  },
  {
    id: "2",
    email: "agent@helpdesk.com",
    name: "Support Agent",
    role: "agent",
    is_active: true,
    created_at: "2025-06-01T08:00:00Z",
  },
  {
    id: "3",
    email: "inactive@helpdesk.com",
    name: "Inactive Agent",
    role: "agent",
    is_active: false,
    created_at: "2025-01-10T12:00:00Z",
  },
];

describe("UserList data state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ data: mockUsers });
  });

  it("renders all users in the table", () => {
    render(<UsersPage />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Admin User")).toBeInTheDocument();
    expect(within(table).getByText("Support Agent")).toBeInTheDocument();
    expect(within(table).getByText("Inactive Agent")).toBeInTheDocument();
  });

  it("renders correct number of data rows", () => {
    render(<UsersPage />);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    const dataRows = rows.slice(1); // skip header row
    expect(dataRows).toHaveLength(3);
  });

  it("renders user emails in the table", () => {
    render(<UsersPage />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("admin@helpdesk.com")).toBeInTheDocument();
    expect(within(table).getByText("agent@helpdesk.com")).toBeInTheDocument();
    expect(within(table).getByText("inactive@helpdesk.com")).toBeInTheDocument();
  });

  it("renders role badges with correct variants", () => {
    render(<UsersPage />);
    const badges = document.querySelectorAll("[data-slot='badge']");

    const adminBadge = Array.from(badges).find(
      (b) => b.textContent === "admin"
    );
    const agentBadges = Array.from(badges).filter(
      (b) => b.textContent === "agent"
    );

    expect(adminBadge).toBeTruthy();
    expect(adminBadge!.className).toContain("bg-primary/10");
    expect(agentBadges).toHaveLength(2);
    agentBadges.forEach((b) => {
      expect(b.className).toContain("bg-muted");
    });
  });

  it("renders status badges with Active/Inactive text", () => {
    render(<UsersPage />);
    const badges = document.querySelectorAll("[data-slot='badge']");

    const activeBadges = Array.from(badges).filter(
      (b) => b.textContent === "Active"
    );
    const inactiveBadges = Array.from(badges).filter(
      (b) => b.textContent === "Inactive"
    );

    expect(activeBadges).toHaveLength(2);
    expect(inactiveBadges).toHaveLength(1);
  });

  it("renders a date in the first user row", () => {
    render(<UsersPage />);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    const firstDataRow = rows[1];
    const cells = within(firstDataRow).getAllByRole("cell");
    const dateCell = cells[4];
    expect(dateCell.textContent).toBeTruthy();
    expect(dateCell.textContent).toMatch(/\d/);
  });
});

describe("UsersPage redirects", () => {
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
    render(<UsersPage />);
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/login",
      replace: true,
    });
  });

  it("redirects to / when user is not admin", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "2",
        email: "agent@helpdesk.com",
        name: "Agent",
        role: "agent",
        created_at: "2025-01-01T00:00:00Z",
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(<UsersPage />);
    expect(navigateMock).toHaveBeenCalledWith({ to: "/", replace: true });
  });
});
