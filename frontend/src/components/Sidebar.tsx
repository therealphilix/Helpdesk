import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { UserRole } from "../lib/roles";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Ticket, Users, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "../lib/utils";

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/tickets", label: "Tickets", icon: Ticket },
    ...(user.role === UserRole.ADMIN
      ? [{ to: "/users", label: "Users", icon: Users }]
      : []),
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col bg-sidebar text-sidebar-foreground">
      <div className="accent-strip shrink-0" />

      <div className="flex items-center gap-2.5 px-5 pt-6 pb-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Ticket className="size-4" />
        </div>
        <span className="text-base font-semibold tracking-tight">Helpdesk</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {links.map((link) => {
          const isActive = location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="mb-3 truncate px-3 text-xs text-sidebar-foreground/50">
          {user.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          onClick={toggle}
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
