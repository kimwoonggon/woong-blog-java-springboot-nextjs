import { expect, test } from './helpers/performance-test'

test('unauthenticated admin access redirects to login', async ({ page }) => {
  await page.goto('/admin/dashboard')

  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('link', { name: 'Sign in with Google' })).toBeVisible()
  await page.screenshot({ path: 'test-results/playwright/admin-redirect.png', fullPage: true })
})
