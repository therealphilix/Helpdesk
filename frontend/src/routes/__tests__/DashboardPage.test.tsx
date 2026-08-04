import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardPage } from "../DashboardPage";

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
import type { DashboardStats } from "../../lib/tickets";

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

function mockUseQuery(overrides: Record<string, unknown>) {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
    const key = queryKey?.[0];
    if (key === "tickets-per-day") {
      return {
        data: [],
        isLoading: overrides.isLoading ?? false,
        isError: overrides.isError ?? false,
        error: overrides.isError ? overrides.error : null,
      };
    }
    return {
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      ...overrides,
    };
  });
}

describe("DashboardPage rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({});
  });

  it("renders the Navbar with Helpdesk brand", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Helpdesk")).toBeInTheDocument();
  });

  it("renders the Dashboard heading", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("renders navbar links", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("link", { name: "Helpdesk" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tickets" })).toBeInTheDocument();
  });
});

describe("DashboardPage loading state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ isLoading: true });
  });

  it("renders skeleton cards while loading", () => {
    render(<DashboardPage />);
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBe(12);
  });
});

describe("DashboardPage error state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ isError: true, error: new Error("Network Error") });
  });

  it("shows an error alert when the request fails", () => {
    render(<DashboardPage />);
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0]).toHaveTextContent("Network Error");
  });

  it("shows a fallback message when error has no message", () => {
    mockUseQuery({ isError: true, error: null });
    render(<DashboardPage />);
    const alerts = screen.getAllByRole("alert");
    expect(alerts.some((a) => a.textContent?.includes("Failed to load dashboard statistics"))).toBe(true);
  });
});

const mockStats: DashboardStats = {
  total_tickets: 42,
  open_tickets: 15,
  ai_resolved_count: 20,
  ai_resolved_percentage: 50.5,
  avg_resolution_time_hours: 3.2,
};

describe("DashboardPage data state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminUser();
    mockUseQuery({ data: mockStats });
  });

  it("renders all five stat cards", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Total Tickets")).toBeInTheDocument();
    expect(screen.getByText("Open Tickets")).toBeInTheDocument();
    expect(screen.getByText("Resolved by AI")).toBeInTheDocument();
    expect(screen.getByText("AI Resolution Rate")).toBeInTheDocument();
    expect(screen.getByText("Avg Resolution Time")).toBeInTheDocument();
  });

  it("renders formatted stat values", () => {
    render(<DashboardPage />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("50.5%")).toBeInTheDocument();
    expect(screen.getByText("3.2 hrs")).toBeInTheDocument();
  });
});

describe("DashboardPage redirects", () => {
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
    render(<DashboardPage />);
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/login",
      replace: true,
    });
  });
});

describe("DashboardPage agent access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockUseQuery({ data: mockStats });
  });

  it("renders for agent user without redirecting", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
