import { expect, test } from './helpers/performance-test'

test.skip(!process.env.PLAYWRIGHT_MANUAL_AUTH, 'Manual auth verification runs only when explicitly requested.')

test('manual admin login verification with headed browser', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('link', { name: 'Sign in with Google' })).toBeVisible()
  await page.pause()

  await expect(page).toHaveURL(/\/admin/)
  await page.screenshot({ path: 'test-results/playwright/manual-auth-admin.png', fullPage: true })
})
