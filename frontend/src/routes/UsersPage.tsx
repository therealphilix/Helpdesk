import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { Navbar } from "../components/Navbar";

export function UsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  if (user.role !== "admin") {
    navigate({ to: "/", replace: true });
    return null;
  }

  return (
    <div>
      <Navbar />
      <main className="p-8">
        <h1 className="text-2xl font-bold">Users</h1>
      </main>
    </div>
  );
}
