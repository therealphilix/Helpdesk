import { test as setup, expect } from "@playwright/test"

const authFile = "e2e/.auth/user.json"

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login")
  await page.fill('input[name="email"]', "admin@test.com")
  await page.fill('input[name="password"]', "AdminPass123!")
  await page.click('button[type="submit"]')
  await page.waitForURL("/")

  await expect(page.getByText("Test Admin")).toBeVisible()

  await page.context().storageState({ path: authFile })
})
