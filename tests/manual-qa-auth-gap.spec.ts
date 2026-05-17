import { expect, test } from './helpers/performance-test'
import { loginAsLocalAdmin } from './helpers/auth'

test('D-2 local admin login creates an authenticated browser session', async ({ page }) => {
  await loginAsLocalAdmin(page, '/admin/dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  const sessionPayload = await page.evaluate(async () => {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    })
    return await response.json() as { authenticated?: boolean; role?: string }
  })

  expect(sessionPayload.authenticated).toBe(true)
  expect(sessionPayload.role).toBe('admin')
})

test('D-6 stale editor sessions fail to save cleanly after logout', async ({ page }) => {
  await loginAsLocalAdmin(page, '/admin/blog/new')
  const expiredTitle = `Expired Session ${Date.now()}`
  await page.locator('input#title').fill(expiredTitle)
  await page.locator('.tiptap.ProseMirror').first().fill('Session expiry body')
  await expect(page.locator('input#title')).toHaveValue(expiredTitle)
  await expect(page.getByRole('button', { name: 'Create Post' })).toBeEnabled()

  await page.evaluate(async () => {
    const csrfResponse = await fetch('/api/auth/csrf', {
      credentials: 'include',
      cache: 'no-store',
    })
    const payload = await csrfResponse.json() as { requestToken: string; headerName: string }
    await fetch('/api/auth/logout?returnUrl=%2F', {
      method: 'POST',
      credentials: 'include',
      headers: {
        [payload.headerName]: payload.requestToken,
      },
    })
  })

  if (await page.getByRole('button', { name: 'Create Post' }).isDisabled()) {
    await page.locator('input#title').fill(expiredTitle)
    await page.locator('.tiptap.ProseMirror').first().fill('Session expiry body')
  }

  await page.getByRole('button', { name: 'Create Post' }).click()
  await expect.poll(async () => {
    try {
      return await page.evaluate(async () => {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-store',
        })
        const payload = await response.json() as { authenticated?: boolean }
        return payload.authenticated ?? false
      })
    } catch {
      return false
    }
  }).toBe(false)

  await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})
