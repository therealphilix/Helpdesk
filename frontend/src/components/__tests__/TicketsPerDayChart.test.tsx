import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketsPerDayChart } from "../TicketsPerDayChart";

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

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

function mockUseQuery(overrides: Record<string, unknown>) {
  useQueryMock.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

describe("TicketsPerDayChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery({});
  });

  it("renders skeleton while loading", () => {
    mockUseQuery({ isLoading: true });
    render(<TicketsPerDayChart />);
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error alert on failure", () => {
    mockUseQuery({ isError: true, error: new Error("Server error") });
    render(<TicketsPerDayChart />);
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it("renders nothing when data is empty array", () => {
    mockUseQuery({ data: [] });
    const { container } = render(<TicketsPerDayChart />);
    expect(container.innerHTML).toBe("");
  });

  it("renders chart card with title when data is present", () => {
    mockUseQuery({
      data: [
        { date: "2026-08-01", count: 5 },
        { date: "2026-08-02", count: 3 },
      ],
    });
    render(<TicketsPerDayChart />);
    expect(screen.getByText("Tickets Per Day")).toBeInTheDocument();
    expect(document.querySelector("[data-slot='chart']")).toBeInTheDocument();
  });
});
