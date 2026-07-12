import { test, expect } from "@playwright/test";

const VALID_EMAIL = "admin@test.com";
const VALID_PASSWORD = "AdminPass123!";

// ────────────────────────────────────────────────────────────────────
// 1. authenticated admin — uses default storageState (admin from auth.setup.ts)
//    These tests are READ-ONLY; they do NOT sign out or invalidate the session.
// ────────────────────────────────────────────────────────────────────
test.describe("authenticated admin", () => {
  test("homepage shows welcome message", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Welcome, Test Admin")).toBeVisible();
  });

  test("navbar shows brand, admin email, and Users link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Helpdesk", { exact: true })).toBeVisible();
    await expect(page.getByText("admin@test.com")).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("admin can access /users page and see heading", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────
// 1b. admin auth flows — sign out, redirects — log in fresh each test
// ────────────────────────────────────────────────────────────────────
test.describe("admin auth flows", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("sign out button redirects to /login and shows Helpdesk Login", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', VALID_PASSWORD);
    await Promise.all([
      page.waitForURL("/"),
      page.locator('button[type="submit"]').click(),
    ]);

    await page.getByRole("button", { name: "Sign Out" }).click();
    await page.waitForURL("/login");
    await expect(page.getByText("Helpdesk Login")).toBeVisible();
  });

  test("after sign out, visiting / redirects to /login", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', VALID_PASSWORD);
    await Promise.all([
      page.waitForURL("/"),
      page.locator('button[type="submit"]').click(),
    ]);

    await page.getByRole("button", { name: "Sign Out" }).click();
    await page.waitForURL("/login");

    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page.getByText("Helpdesk Login")).toBeVisible();
  });

  test("logged-in admin visiting /login redirects back to /", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', VALID_PASSWORD);
    await Promise.all([
      page.waitForURL("/"),
      page.locator('button[type="submit"]').click(),
    ]);

    await page.goto("/login");
    await page.waitForURL("/");
    await expect(page.getByText("Welcome, Test Admin")).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────
// 2. authenticated agent — beforeEach logs in as agent, no storageState
// ────────────────────────────────────────────────────────────────────
test.describe("authenticated agent", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "agent@test.com");
    await page.fill('input[name="password"]', "AgentPass123!");
    await Promise.all([
      page.waitForURL("/"),
      page.locator('button[type="submit"]').click(),
    ]);
  });

  test("agent sees welcome message on homepage", async ({ page }) => {
    await expect(page.getByText("Welcome, Test Agent")).toBeVisible();
  });

  test("agent does NOT see Users link in navbar", async ({ page }) => {
    await expect(page.locator('nav a:has-text("Users")')).toHaveCount(0);
  });

  test("agent is redirected from /users to /", async ({ page }) => {
    await page.goto("/users");
    await page.waitForURL("/");
    await expect(page.getByText("Welcome, Test Agent")).toBeVisible();
  });

  test("agent sees agent email in navbar", async ({ page }) => {
    await expect(page.getByText("agent@test.com")).toBeVisible();
  });

  test("agent can sign out", async ({ page }) => {
    await page.getByRole("button", { name: "Sign Out" }).click();
    await page.waitForURL("/login");
    await expect(page.getByText("Helpdesk Login")).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────
// 3. unauthenticated — no storageState, no cookies
// ────────────────────────────────────────────────────────────────────
test.describe("unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/ redirects to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page.getByText("Helpdesk Login")).toBeVisible();
  });

  test("/users redirects to /login", async ({ page }) => {
    await page.goto("/users");
    await page.waitForURL("/login");
    await expect(page.getByText("Helpdesk Login")).toBeVisible();
  });

  test("/login page shows Helpdesk Login title and description", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByText("Helpdesk Login")).toBeVisible();
    await expect(
      page.getByText("Enter your credentials to access the helpdesk"),
    ).toBeVisible();
  });

  test("login form has Email input, Password input, and Sign In button", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign In" }),
    ).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────
// 4. login form validation — unauthenticated, tests zod schema errors
// ────────────────────────────────────────────────────────────────────
test.describe("login form validation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("empty email shows Invalid email address", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="password"]', VALID_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.getByText("Invalid email address")).toBeVisible();
  });

  test("invalid email format shows Invalid email address", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "not-an-email");
    await page.fill('input[name="password"]', VALID_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.getByText("Invalid email address")).toBeVisible();
  });

  test("empty password shows minimum length error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.click('button[type="submit"]');
    await expect(
      page.getByText("Password must be at least 12 characters"),
    ).toBeVisible();
  });

  test("password too short shows minimum length error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', "Short1!");
    await page.click('button[type="submit"]');
    await expect(
      page.getByText("Password must be at least 12 characters"),
    ).toBeVisible();
  });

  test("password missing uppercase shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', "alllowercase1!");
    await page.click('button[type="submit"]');
    await expect(
      page.getByText("Must contain an uppercase letter"),
    ).toBeVisible();
  });

  test("password missing lowercase shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', "ALLUPPERCASE1!");
    await page.click('button[type="submit"]');
    await expect(
      page.getByText("Must contain a lowercase letter"),
    ).toBeVisible();
  });

  test("password missing digit shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', "NoDigitsHere!");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Must contain a digit")).toBeVisible();
  });

  test("password missing special char shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', "NoSpecialHere1");
    await page.click('button[type="submit"]');
    await expect(
      page.getByText("Must contain a special character"),
    ).toBeVisible();
  });

  test("multiple validation errors show simultaneously", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "not-an-email");
    await page.fill('input[name="password"]', "short");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Invalid email address")).toBeVisible();
    await expect(
      page.getByText("Password must be at least 12 characters"),
    ).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────
// 5. login submission — unauthenticated, tests backend responses
// ────────────────────────────────────────────────────────────────────
test.describe("login submission", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("successful admin login navigates to / and shows welcome", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', VALID_PASSWORD);
    await Promise.all([
      page.waitForURL("/"),
      page.locator('button[type="submit"]').click(),
    ]);
    await expect(page.getByText("Welcome, Test Admin")).toBeVisible();
  });

  test("successful agent login navigates to / and shows welcome", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "agent@test.com");
    await page.fill('input[name="password"]', "AgentPass123!");
    await Promise.all([
      page.waitForURL("/"),
      page.locator('button[type="submit"]').click(),
    ]);
    await expect(page.getByText("Welcome, Test Agent")).toBeVisible();
  });

  test("wrong email shows Invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "nonexistent@test.com");
    await page.fill('input[name="password"]', VALID_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.getByText("Invalid credentials")).toBeVisible();
  });

  test("wrong password shows Invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', "WrongPass123!");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Invalid credentials")).toBeVisible();
  });

  test("submit button shows Signing in... while submitting", async ({
    page,
  }) => {
    // Intercept login to delay the response so we can observe the loading state
    await page.route("**/api/auth/login", async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });

    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', VALID_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(
      page.getByRole("button", { name: "Signing in..." }),
    ).toBeVisible();

    await page.waitForURL("/");
  });
});

// ────────────────────────────────────────────────────────────────────
// 6. session persistence — log in fresh, then verify session survives
// ────────────────────────────────────────────────────────────────────
test.describe("session persistence", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("logged-in user visiting /login redirects to /", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', VALID_PASSWORD);
    await Promise.all([
      page.waitForURL("/"),
      page.locator('button[type="submit"]').click(),
    ]);

    await page.goto("/login");
    await page.waitForURL("/");
    await expect(page.getByText("Welcome, Test Admin")).toBeVisible();
  });

  test("page refresh maintains authenticated state", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', VALID_PASSWORD);
    await Promise.all([
      page.waitForURL("/"),
      page.locator('button[type="submit"]').click(),
    ]);

    await expect(page.getByText("Welcome, Test Admin")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Welcome, Test Admin")).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────
// 7. edge cases — unauthenticated
// ────────────────────────────────────────────────────────────────────
test.describe("edge cases", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("error alert is cleared after successful re-submission", async ({
    page,
  }) => {
    await page.goto("/login");

    // Submit with bad credentials
    await page.fill('input[name="email"]', "wrong@test.com");
    await page.fill('input[name="password"]', "WrongPass123!");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Invalid credentials")).toBeVisible();

    // Submit with correct credentials — error should clear, navigation succeeds
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', VALID_PASSWORD);
    await Promise.all([
      page.waitForURL("/"),
      page.locator('button[type="submit"]').click(),
    ]);
    await expect(page.getByText("Welcome, Test Admin")).toBeVisible();
  });

  test("form uses noValidate attribute for custom validation only", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.locator("form")).toHaveAttribute("novalidate");
  });

  test("double-click submit prevention — button is disabled during submission", async ({
    page,
  }) => {
    // Delay the login response so the submitting state is observable
    await page.route("**/api/auth/login", async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });

    await page.goto("/login");
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="password"]', VALID_PASSWORD);
    await page.click('button[type="submit"]');

    // Button should be disabled while the request is in flight
    await expect(
      page.getByRole("button", { name: "Signing in..." }),
    ).toBeDisabled();

    await page.waitForURL("/");
  });
});
