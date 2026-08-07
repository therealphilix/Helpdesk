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
      <h1 className="text-2xl font-medium tracking-tight mb-6">Dashboard</h1>
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
          <Card key={i}>
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
    { label: "Total Tickets", value: data.total_tickets.toLocaleString(), color: "border-l-primary" },
    { label: "Open Tickets", value: data.open_tickets.toLocaleString(), color: "border-l-warning" },
    { label: "Resolved by AI", value: data.ai_resolved_count.toLocaleString(), color: "border-l-accent" },
    { label: "AI Resolution Rate", value: `${data.ai_resolved_percentage}%`, color: "border-l-success" },
    { label: "Avg Resolution Time", value: `${data.avg_resolution_time_hours} hrs`, color: "border-l-chart-2" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className={`border-l-[3px] ${stat.color}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
