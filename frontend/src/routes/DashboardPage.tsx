import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { AppLayout } from "../components/AppLayout";
import { TicketsPerDayChart } from "../components/TicketsPerDayChart";
import { apiClient } from "../api/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats } from "../lib/tickets";

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  return (
    <AppLayout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow">Sorting room</p>
          <h1 className="text-[28px] font-semibold tracking-tight leading-none mt-1" style={{ fontFamily: "var(--font-display)" }}>Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Today’s correspondence at a glance — postmarked and pending.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="stamp stamp-open !rotate-0">Open</span>
          <span className="stamp stamp-resolved !rotate-0">Resolved</span>
          <span className="stamp stamp-category !rotate-0">Catalogued</span>
        </div>
      </div>
      <div className="brass-rule mb-6" />
      <DashboardMetrics />
      <div className="mt-6">
        <TicketsPerDayChart />
      </div>
    </AppLayout>
  );
}

function DashboardMetrics() {
  const { data, isLoading, isError, error } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await apiClient.get("/dashboard/stats");
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="paper-sheet">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load dashboard statistics."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const stats = [
    { label: "Total Tickets", value: data.total_tickets.toLocaleString(), sub: "Filed", accent: "border-l-primary" },
    { label: "Open Tickets", value: data.open_tickets.toLocaleString(), sub: "Awaiting reply", accent: "border-l-primary" },
    { label: "Resolved by AI", value: data.ai_resolved_count.toLocaleString(), sub: "Auto-sorted", accent: "border-l-accent" },
    { label: "AI Resolution Rate", value: `${data.ai_resolved_percentage}%`, sub: "Clerk assist", accent: "border-l-success" },
    { label: "Avg Resolution Time", value: `${data.avg_resolution_time_hours} hrs`, sub: "Mean", accent: "border-l-[var(--chart-2)]" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className={`paper-sheet border-l-[3px] ${stat.accent} hover:shadow-md transition-shadow`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
              {stat.label}
            </CardTitle>
            <p className="eyebrow !normal-case !tracking-normal opacity-60">{stat.sub}</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
