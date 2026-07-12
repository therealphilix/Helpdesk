import { test as setup, expect } from "@playwright/test"

const authFile = "e2e/.auth/user.json"

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login")
  await page.fill('input[name="email"]', "admin@test.com")
  await page.fill('input[name="password"]', "AdminPass123!")
  await page.locator('button[type="submit"]').waitFor({ state: "visible" })
  await Promise.all([
    page.waitForURL("/"),
    page.locator('button[type="submit"]').click(),
  ])

  await expect(page.getByText("Test Admin")).toBeVisible()

  await page.context().storageState({ path: authFile })
})
