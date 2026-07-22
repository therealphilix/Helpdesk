import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { Navbar } from "../components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TicketsTable } from "../components/TicketsTable";

export function TicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  return (
    <div>
      <Navbar />
      <main className="p-8 max-w-6xl mx-auto">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>
              View and manage support tickets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TicketsTable />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
