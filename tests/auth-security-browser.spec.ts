import { expect, test } from './helpers/performance-test'
import { loginAsLocalAdmin } from './helpers/auth'


test('browser mutation flow requires csrf token and succeeds with one', async ({ page }) => {
  await loginAsLocalAdmin(page, '/admin/dashboard')

  const failedStatus = await page.evaluate(async () => {
    const response = await fetch('/api/admin/site-settings', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerName: 'CSRF Missing' }),
    })

    return response.status
  })

  expect(failedStatus).toBe(400)

  const successStatus = await page.evaluate(async () => {
    const csrfResponse = await fetch('/api/auth/csrf', {
      credentials: 'include',
      cache: 'no-store',
    })
    const payload = await csrfResponse.json() as { requestToken: string; headerName: string }

    const response = await fetch('/api/admin/site-settings', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        [payload.headerName]: payload.requestToken,
      },
      body: JSON.stringify({ ownerName: 'CSRF Present' }),
    })

    return response.status
  })

  expect(successStatus).toBe(200)
})

test('browser auth flow avoids storage tokens and logout works with csrf', async ({ page }) => {
  await loginAsLocalAdmin(page, '/')

  const storageKeys = await page.evaluate(() => ({
    local: Object.keys(window.localStorage),
    session: Object.keys(window.sessionStorage),
  }))

  expect(storageKeys.local.filter((key) => /token|jwt|auth/i.test(key))).toHaveLength(0)
  expect(storageKeys.session.filter((key) => /token|jwt|auth/i.test(key))).toHaveLength(0)

  const authenticatedAfterLogout = await page.evaluate(async () => {
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

    const sessionResponse = await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    })

    const sessionPayload = await sessionResponse.json() as { authenticated?: boolean }
    return sessionPayload.authenticated ?? false
  })

  expect(authenticatedAfterLogout).toBe(false)
})
