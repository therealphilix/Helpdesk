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

export function HomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-fit">
          <CardContent className="py-4 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
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
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user.name}</CardTitle>
            <CardDescription>This is the helpdesk dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Use the navigation above to manage tickets and access helpdesk features.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
