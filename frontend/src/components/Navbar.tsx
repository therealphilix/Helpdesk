import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../lib/roles";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <nav className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="font-semibold text-lg hover:text-foreground transition-colors">
          Helpdesk
        </Link>
        <Link to="/tickets" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Tickets
        </Link>
        {user.role === UserRole.ADMIN && (
          <Link to="/users" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{user.email}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
