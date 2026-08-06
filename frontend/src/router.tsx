import {
  createRouter,
  createRootRoute,
  createRoute,
} from "@tanstack/react-router";
import * as Sentry from "@sentry/react";
import { DashboardPage } from "./routes/DashboardPage";
import { HomePage } from "./routes/HomePage";
import { LoginPage } from "./routes/LoginPage";
import { TicketDetailPage } from "./routes/TicketDetailPage";
import { TicketsPage } from "./routes/TicketsPage";
import { UsersPage } from "./routes/UsersPage";

function RootErrorComponent({ error }: { error: Error }) {
  if (error && error instanceof Error) {
    Sentry.captureException(error);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground text-center max-w-md">
        {error instanceof Error ? error.message : "An unexpected error occurred."}
      </p>
      <button
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        onClick={() => window.location.reload()}
      >
        Refresh page
      </button>
    </div>
  );
}

const rootRoute = createRootRoute({
  errorComponent: RootErrorComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const ticketsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tickets",
  component: TicketsPage,
});

const ticketDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tickets/$ticketId",
  component: TicketDetailPage,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users",
  component: UsersPage,
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, dashboardRoute, ticketsRoute, ticketDetailRoute, usersRoute]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
