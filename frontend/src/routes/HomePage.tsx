import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";

export function HomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return null;
  }

  if (!user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  navigate({ to: "/dashboard", replace: true });
  return null;
}
