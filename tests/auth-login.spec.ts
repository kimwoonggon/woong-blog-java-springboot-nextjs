import { expect, test } from './helpers/performance-test'

test.use({ storageState: { cookies: [], origins: [] } })

test('anonymous login page renders and sign-in CTA requests the backend auth launcher', async ({ page }) => {
  const launcherRequests: string[] = []
  await page.route('**/api/auth/login?**', async (route) => {
    launcherRequests.push(route.request().url())
    await route.fulfill({
      status: 503,
      contentType: 'text/plain',
      body: 'Authentication launcher unavailable in this test.',
    })
  })

  await page.goto('/login?returnUrl=%2Fadmin%2Fblog%3Fdraft%3D1')

  const button = page.getByRole('link', { name: 'Sign in with Google' })
  await expect(button).toBeVisible()
  await expect(button).toHaveAttribute('href', '/api/auth/login?returnUrl=%2Fadmin%2Fblog%3Fdraft%3D1')

  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login?returnUrl=')),
    button.click(),
  ])

  expect(launcherRequests).toHaveLength(1)
  expect(new URL(launcherRequests[0]).searchParams.get('returnUrl')).toBe('/admin/blog?draft=1')
  await expect(page.getByText('Authentication launcher unavailable in this test.')).toBeVisible()
  await expect(page.getByText(/logged in|signed in|success/i)).toHaveCount(0)
  await page.screenshot({ path: 'test-results/playwright/auth-login-page.png', fullPage: true })
})

test('login page renders safe error copy without echoing unknown error query text', async ({ page }) => {
  await page.goto('/login?error=%3Cscript%3Ealert(1)%3C%2Fscript%3E')

  await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible()
  await expect(page.getByText('Sign-in could not be completed. Please try again.')).toBeVisible()
  await expect(page.getByText(/<script>|alert\(1\)/)).toHaveCount(0)
})
