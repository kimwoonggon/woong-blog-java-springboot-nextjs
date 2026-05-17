import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'
import { toggleThemeForViewport } from './helpers/responsive-policy'

test('VA-033 theme toggle is direct and does not open obsolete dropdown chrome', async ({ page }) => {
  await page.goto('/')

  const navbar = page.locator('header').first()
  await expect(navbar).toBeVisible()
  const navbarZ = Number.parseInt(await getStyle(navbar, 'z-index'), 10)

  await toggleThemeForViewport(page)

  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
  await expect(page.locator('[data-slot="dropdown-menu-content"]')).toHaveCount(0)
  expect(navbarZ).toBeGreaterThanOrEqual(50)
})

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('VA-033 dialogs render above dropdown layering', async ({ page }) => {
  await page.goto('/admin/blog')
  const deleteButton = page.getByTestId('admin-blog-row').first().getByRole('button', { name: /^Delete post:/ })
  await expect(deleteButton).toBeEnabled()
  await deleteButton.click()

  const dialog = page.locator('[data-slot="dialog-content"]').first()
  await expect(dialog).toBeVisible()
  const dialogZ = Number.parseInt(await getStyle(dialog, 'z-index'), 10)
  expect(dialogZ).toBeGreaterThan(50)
})
