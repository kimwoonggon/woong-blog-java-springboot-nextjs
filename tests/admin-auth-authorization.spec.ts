import { expect, test } from './helpers/performance-test'

test.use({ storageState: { cookies: [], origins: [] } })

test('non-admin local login attempts are rejected before admin access is granted', async ({ page }) => {
  const baseUrl = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  await page.goto(
    `${baseUrl}/api/auth/test-login?email=${encodeURIComponent('user@example.com')}&returnUrl=%2Fadmin%2Fdashboard`,
    { waitUntil: 'networkidle' },
  )

  await expect(page).toHaveURL(/\/login\?error=admin_only/)
  await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in with Google' })).toBeVisible()

  await expect.poll(async () => {
    return await page.evaluate(async () => {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      })

      const payload = await response.json() as { authenticated?: boolean; role?: string }
      return {
        authenticated: payload.authenticated ?? false,
        role: payload.role ?? null,
      }
    })
  }).toEqual({ authenticated: false, role: null })
})
