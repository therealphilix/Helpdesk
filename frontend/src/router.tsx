import {
  createRouter,
  createRootRoute,
  createRoute,
} from "@tanstack/react-router";
import { HomePage } from "./routes/HomePage";
import { LoginPage } from "./routes/LoginPage";
import { TicketDetailPage } from "./routes/TicketDetailPage";
import { TicketsPage } from "./routes/TicketsPage";
import { UsersPage } from "./routes/UsersPage";

const rootRoute = createRootRoute();

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

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, ticketsRoute, ticketDetailRoute, usersRoute]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
