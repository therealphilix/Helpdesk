import { test, expect } from "@playwright/test"

// Tickets with data — create via webhook, verify in table.
// This is intentionally an E2E test because it validates the full
// webhook → database → API → frontend pipeline. UI-only assertions
// (rendering, loading, error, empty state, redirects, navbar links)
// live in TicketsPage.test.tsx as fast component tests.
test.describe("tickets with data", () => {
  test("creating tickets via webhook displays them in the table", async ({
    page,
    request,
  }) => {
    const ticket1 = {
      sender_email: "alice.student@university.edu",
      sender_name: "Alice Student",
      subject: "Cannot access course materials",
      body_text: "I am unable to access the course materials for CS101.",
    }

    const ticket2 = {
      sender_email: "bob.student@university.edu",
      sender_name: "Bob Student",
      subject: "Refund request for tuition",
      body_text: "I would like to request a refund for the summer semester.",
    }

    await request.post("/api/webhooks/email", { data: ticket1 })
    await request.post("/api/webhooks/email", { data: ticket2 })

    // Navigate to tickets page as authenticated admin
    await page.goto("/tickets")

    // Table headers should be present
    await expect(
      page.getByRole("columnheader", { name: "Sender" }),
    ).toBeVisible()

    // Ticket 1 — sender name + email
    await expect(
      page.getByRole("cell", { name: "Alice Student" }),
    ).toBeVisible()
    await expect(
      page.getByRole("cell", { name: "alice.student@university.edu" }),
    ).toBeVisible()
    await expect(
      page.getByRole("cell", { name: "Cannot access course materials" }),
    ).toBeVisible()

    // Ticket 2 — sender name + email
    await expect(
      page.getByRole("cell", { name: "Bob Student" }),
    ).toBeVisible()
    await expect(
      page.getByRole("cell", { name: "bob.student@university.edu" }),
    ).toBeVisible()
    await expect(
      page.getByRole("cell", { name: "Refund request for tuition" }),
    ).toBeVisible()

    // All new tickets have "open" status — badge text should be visible
    await expect(page.getByText("open").first()).toBeVisible()

    // Empty state should NOT be visible now that tickets exist
    await expect(page.getByText("No tickets found.")).not.toBeVisible()
  })
})
