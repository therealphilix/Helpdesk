import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <span className="font-semibold text-lg">Helpdesk</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-800 transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
