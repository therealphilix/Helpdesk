import { test, expect } from "@playwright/test"

test.describe("users page", () => {
  // Run tests serially — UPDATE test mutates the seeded agent user,
  // and DELETE test creates a disposable user that READ should not see.
  test.describe.configure({ mode: "serial" })

  const uniqueSuffix = Date.now()
  const CREATE_EMAIL = `e2e-create-${uniqueSuffix}@test.com`
  const CREATE_NAME = "E2E Create User"
  const DELETE_EMAIL = `e2e-delete-${uniqueSuffix}@test.com`
  const DELETE_NAME = "E2E Delete User"

  // ──────────────────────────────────────────────────────────────────
  // READ — list users
  // ──────────────────────────────────────────────────────────────────
  test("lists existing users with correct table structure", async ({
    page,
  }) => {
    await page.goto("/users")

    // Page heading + description
    await expect(
      page.locator("[data-slot='card-title']")
    ).toContainText("Users")
    await expect(
      page.getByText("Manage user accounts and their roles.")
    ).toBeVisible()

    // Table headers
    await expect(
      page.getByRole("columnheader", { name: "Name" })
    ).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Email" })
    ).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Role" })
    ).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Created" })
    ).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Actions" })
    ).toBeVisible()

    // Seeded users
    await expect(
      page.getByRole("cell", { name: "Test Admin", exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("cell", { name: "admin@test.com" })
    ).toBeVisible()
    await expect(
      page.getByRole("cell", { name: "Test Agent", exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("cell", { name: "agent@test.com" })
    ).toBeVisible()

    // Create User button is visible
    await expect(
      page.getByRole("button", { name: "Create User" })
    ).toBeVisible()
  })

  // ──────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────
  test("creates a new user via the dialog", async ({ page }) => {
    await page.goto("/users")

    // Open the create dialog
    await page.getByRole("button", { name: "Create User" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Create User" })
    ).toBeVisible()
    await expect(
      page.getByText("Add a new user to the helpdesk system.")
    ).toBeVisible()

    // Fill the form
    await page.getByLabel("Name").fill(CREATE_NAME)
    await page.getByLabel("Email").fill(CREATE_EMAIL)
    await page.getByLabel("Password").fill("StrongPass123!")

    // Submit (use the button inside the dialog, not the page-level trigger)
    await dialog.getByRole("button", { name: "Create User" }).click()

    // Dialog closes and the new user appears in the table
    await expect(dialog).not.toBeVisible()
    await expect(
      page.getByRole("cell", { name: CREATE_NAME, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("cell", { name: CREATE_EMAIL })
    ).toBeVisible()
  })

  // ──────────────────────────────────────────────────────────────────
  // UPDATE — edit the seeded agent user, then restore original name
  // ──────────────────────────────────────────────────────────────────
  test("updates an existing user's name", async ({ page }) => {
    await page.goto("/users")

    // Click the Edit button for the agent user
    await page.getByRole("button", { name: "Edit Test Agent" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Edit User" })
    ).toBeVisible()
    await expect(
      page.getByText("Update the user's information.")
    ).toBeVisible()

    // Clear and type a new name
    const nameInput = page.getByLabel("Name")
    await nameInput.clear()
    await nameInput.fill("Test Agent Updated")

    // Submit
    await dialog.getByRole("button", { name: "Save Changes" }).click()

    // Dialog closes and updated name appears in the table
    await expect(dialog).not.toBeVisible()
    await expect(
      page.getByRole("cell", { name: "Test Agent Updated", exact: true })
    ).toBeVisible()

    // Cleanup: restore the original name so other tests see the seeded data
    await page.getByRole("button", { name: "Edit Test Agent Updated" }).click()
    const restoreDialog = page.getByRole("dialog")
    await page.getByLabel("Name").clear()
    await page.getByLabel("Name").fill("Test Agent")
    await restoreDialog
      .getByRole("button", { name: "Save Changes" })
      .click()
    await expect(restoreDialog).not.toBeVisible()
    await expect(
      page.getByRole("cell", { name: "Test Agent", exact: true })
    ).toBeVisible()
  })

  // ──────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────
  test("deletes a non-admin user", async ({ page }) => {
    await page.goto("/users")

    // Create a disposable user to delete
    await page.getByRole("button", { name: "Create User" }).click()
    const createDialog = page.getByRole("dialog")
    await page.getByLabel("Name").fill(DELETE_NAME)
    await page.getByLabel("Email").fill(DELETE_EMAIL)
    await page.getByLabel("Password").fill("StrongPass123!")
    await createDialog.getByRole("button", { name: "Create User" }).click()
    await expect(createDialog).not.toBeVisible()
    await expect(
      page.getByRole("cell", { name: DELETE_NAME, exact: true })
    ).toBeVisible()

    // Click the Delete button for the disposable user
    await page.getByRole("button", { name: `Delete ${DELETE_NAME}` }).click()

    const deleteDialog = page.getByRole("dialog")
    await expect(deleteDialog).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Delete User" })
    ).toBeVisible()
    await expect(
      page.getByText(
        "This will deactivate the user's account and invalidate all their active sessions."
      )
    ).toBeVisible()
    await expect(
      page.getByText(`Are you sure you want to delete ${DELETE_NAME}?`)
    ).toBeVisible()

    // Confirm deletion
    await deleteDialog.getByRole("button", { name: "Delete" }).click()

    // Dialog closes and the user disappears from the table
    await expect(deleteDialog).not.toBeVisible()
    await expect(
      page.getByRole("cell", { name: DELETE_NAME, exact: true })
    ).not.toBeVisible()
  })

  test("admin users have no delete button", async ({ page }) => {
    await page.goto("/users")

    // Admin row should have an Edit button but no Delete button
    await expect(
      page.getByRole("button", { name: "Edit Test Admin" })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Delete Test Admin" })
    ).not.toBeVisible()
  })
})
