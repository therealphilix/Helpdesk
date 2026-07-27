import { test, expect } from "@playwright/test"

// Ticket Detail E2E tests — full-stack integration flows only.
// UI rendering assertions, loading/error states, redirects, and mutation
// mock verification live in TicketDetailPage.test.tsx as component tests.

test.describe("Ticket detail page", () => {
  test("navigate from tickets list to detail page", async ({
    page,
    request,
  }) => {
    // Create a ticket via webhook
    await request.post("/api/webhooks/email", {
      data: {
        sender_email: "eve.student@university.edu",
        sender_name: "Eve Student",
        subject: "Printer not working in lab",
        body_text:
          "The printer in Lab B is not responding. I have a paper due tomorrow.",
      },
    })

    // Navigate to tickets list
    await page.goto("/tickets")

    // Click the ticket row by subject to navigate to detail
    await page
      .getByRole("cell", { name: "Printer not working in lab" })
      .click()

    // Detail page should render ticket content from the real API
    await expect(
      page.getByText("Printer not working in lab"),
    ).toBeVisible()
    await expect(page.getByText("Eve Student")).toBeVisible()
    await expect(
      page.getByText(/eve\.student@university\.edu/),
    ).toBeVisible()
    await expect(
      page.getByText(
        /The printer in Lab B is not responding. I have a paper due tomorrow./,
      ),
    ).toBeVisible()
  })

  test("status change updates the badge", async ({ page, request }) => {
    // Create ticket and capture the ID from the response
    const res = await request.post("/api/webhooks/email", {
      data: {
        sender_email: "frank.student@university.edu",
        sender_name: "Frank Student",
        subject: "Wifi down in dorm",
        body_text: "The wifi has been down for 2 hours.",
      },
    })
    const { id: ticketId } = await res.json()

    await page.goto(`/tickets/${ticketId}`)

    // Initial status badge shows "open"
    await expect(page.locator("[data-slot='badge']")).toContainText("open")

    // Open status select and choose "Resolved"
    await page.getByRole("combobox", { name: "Status" }).click()
    await page.getByRole("option", { name: "Resolved" }).click()

    // Badge updates to "resolved"
    await expect(page.locator("[data-slot='badge']")).toContainText(
      "resolved",
    )

    // Reload and verify persistence
    await page.reload()
    await expect(page.locator("[data-slot='badge']")).toContainText(
      "resolved",
    )
  })

  test("category change updates the select value", async ({
    page,
    request,
  }) => {
    const res = await request.post("/api/webhooks/email", {
      data: {
        sender_email: "grace.student@university.edu",
        sender_name: "Grace Student",
        subject: "Refund for textbook",
        body_text: "I need a refund for the textbook I purchased.",
      },
    })
    const { id: ticketId } = await res.json()

    await page.goto(`/tickets/${ticketId}`)

    // Open category select and choose "Refund Request"
    await page.getByRole("combobox", { name: "Category" }).click()
    await page.getByRole("option", { name: "Refund Request" }).click()

    // Select trigger displays the new category value
    await expect(
      page.getByRole("combobox", { name: "Category" }),
    ).toContainText("Refund Request")
  })

  test("assignee change updates the select value", async ({
    page,
    request,
  }) => {
    const res = await request.post("/api/webhooks/email", {
      data: {
        sender_email: "hank.student@university.edu",
        sender_name: "Hank Student",
        subject: "Account locked out",
        body_text: "My account is locked and I cannot log in.",
      },
    })
    const { id: ticketId } = await res.json()

    await page.goto(`/tickets/${ticketId}`)

    // Open assignee select and choose "Test Agent" (seeded agent user)
    await page.getByRole("combobox", { name: "Assigned To" }).click()
    await page.getByRole("option", { name: "Test Agent" }).click()

    // Select trigger displays the new assignee name
    await expect(
      page.getByRole("combobox", { name: "Assigned To" }),
    ).toContainText("Test Agent")
  })

  test("reply submission displays reply and clears textarea", async ({
    page,
    request,
  }) => {
    const res = await request.post("/api/webhooks/email", {
      data: {
        sender_email: "ivy.student@university.edu",
        sender_name: "Ivy Student",
        subject: "Course enrollment error",
        body_text: "I get an error when trying to enroll in CS201.",
      },
    })
    const { id: ticketId } = await res.json()

    await page.goto(`/tickets/${ticketId}`)

    // No replies section yet
    await expect(page.getByText("Replies")).not.toBeVisible()

    // Type and submit a reply
    const replyText = "I have checked your enrollment and fixed the issue."
    await page.getByPlaceholder("Type your reply...").fill(replyText)
    await page.getByRole("button", { name: "Send" }).click()

    // "Replies" heading now appears
    await expect(page.getByText("Replies")).toBeVisible()

    // Submitted reply text is displayed in the thread
    await expect(page.getByText(replyText)).toBeVisible()

    // Textarea is cleared after successful submission
    await expect(
      page.getByPlaceholder("Type your reply..."),
    ).toHaveValue("")
  })

  test("back button navigates to tickets page", async ({
    page,
    request,
  }) => {
    const res = await request.post("/api/webhooks/email", {
      data: {
        sender_email: "jack.student@university.edu",
        sender_name: "Jack Student",
        subject: "Password reset help",
        body_text: "I forgot my password and the reset link is not working.",
      },
    })
    const { id: ticketId } = await res.json()

    await page.goto(`/tickets/${ticketId}`)

    // Click "Back to tickets"
    await page.getByRole("button", { name: "Back to tickets" }).click()

    // Navigated to /tickets
    await page.waitForURL("/tickets")
    await expect(
      page.getByText("View and manage support tickets."),
    ).toBeVisible()
  })
})
