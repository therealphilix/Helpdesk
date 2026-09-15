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
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Mail queue</p>
          <h1 className="text-[28px] font-semibold tracking-tight leading-none mt-1" style={{ fontFamily: "var(--font-display)" }}>Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Sorted by postmark. Open a slip to read the letter.
          </p>
        </div>
        <span className="hidden sm:inline-flex stamp stamp-category !rotate-0">Live sorting</span>
      </div>
      <div className="brass-rule my-6" />
      <TicketsTable />
    </AppLayout>
  );
}
