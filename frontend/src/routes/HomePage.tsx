import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { Navbar } from "../components/Navbar";

export function HomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  return (
    <div>
      <Navbar />
      <main className="p-8">
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="text-gray-600 mt-2">This is the helpdesk dashboard.</p>
      </main>
    </div>
  );
}
