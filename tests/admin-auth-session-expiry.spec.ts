import { expect, test } from './helpers/performance-test'
import { loginAsLocalAdmin } from './helpers/auth'

test('expired admin sessions redirect protected routes back to login', async ({ page }) => {
  await loginAsLocalAdmin(page, '/admin/dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.evaluate(async () => {
    const csrfResponse = await fetch('/api/auth/csrf', {
      credentials: 'include',
      cache: 'no-store',
    })
    const payload = await csrfResponse.json() as { requestToken: string; headerName: string }

    await fetch('/api/auth/logout?returnUrl=%2Flogin', {
      method: 'POST',
      credentials: 'include',
      headers: {
        [payload.headerName]: payload.requestToken,
      },
    })
  })

  await expect.poll(async () => {
    return await page.evaluate(async () => {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = await response.json() as { authenticated?: boolean }
      return payload.authenticated ?? false
    })
  }).toBe(false)

  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible()
})
