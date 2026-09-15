import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { UserRole } from "../lib/roles";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Ticket, Users, LogOut, Moon, Sun, Mail } from "lucide-react";
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
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="accent-strip shrink-0" />

      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b border-sidebar-border/60">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
          <Mail className="size-4" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Helpdesk
          </span>
          <span className="eyebrow !text-[9px] !tracking-[0.14em] opacity-60">Correspondence</span>
        </div>
      </div>

      <div className="px-3 pt-4 pb-2">
        <p className="eyebrow px-2 mb-2">Filing drawer</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {links.map((link) => {
          const isActive = location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors border border-transparent",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border shadow-sm"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-md border transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary"
                    : "bg-sidebar-accent border-sidebar-border text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                )}
              >
                <link.icon className="size-3.5" />
              </span>
              {link.label}
              {isActive && (
                <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary shadow-sm" aria-hidden />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4 space-y-3">
        <div className="rounded-lg bg-sidebar-accent border border-sidebar-border px-3 py-2.5">
          <p className="eyebrow">Signed in as</p>
          <p className="truncate text-xs font-medium mt-1">{user.email}</p>
          <p className="eyebrow !normal-case !tracking-normal mt-0.5 opacity-70">{user.role}</p>
        </div>
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={toggle}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );
}
