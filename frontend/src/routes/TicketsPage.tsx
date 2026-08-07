import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { AppLayout } from "../components/AppLayout";
import { TicketsTable } from "../components/TicketsTable";

export function TicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate({ to: "/login", replace: true });
    return null;
  }
  
  return (
    <AppLayout>
      <h1 className="text-2xl font-medium tracking-tight mb-1">Tickets</h1>
      <p className="text-muted-foreground text-sm mb-6">
        View and manage support tickets.
      </p>
      <TicketsTable />
    </AppLayout>
  );
}
