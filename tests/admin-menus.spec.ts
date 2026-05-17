import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })


test('authenticated admin sees primary admin menus', async ({ page }) => {
  await page.goto('/admin/dashboard')

  await expect(page).toHaveURL(/\/admin/)
  const nav = page.getByRole('navigation')
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Works' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Blog', exact: true })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Blog Notion View' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Pages & Settings' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Members' })).toBeVisible()
  const sidebar = page.getByRole('complementary')
  await expect(sidebar.getByRole('link', { name: /View Site/i })).toBeVisible()

  await page.screenshot({ path: 'test-results/playwright/admin-menus.png', fullPage: true })
})
