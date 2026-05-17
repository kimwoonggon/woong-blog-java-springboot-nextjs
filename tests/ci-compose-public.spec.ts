import { expect, test } from './helpers/performance-test'

const expectedShortcut = process.env.PLAYWRIGHT_EXPECT_LOCAL_ADMIN_SHORTCUT ?? 'hidden'

test('compose runtime serves frontend, backend, and db-backed public pages', async ({ page, request }) => {
  const health = await request.get('/api/health')
  expect(health.ok()).toBeTruthy()
  await expect(health.json()).resolves.toMatchObject({ status: 'ok', service: 'portfolio-api' })

  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('navbar-brand')).toBeVisible()

  await page.goto('/blog', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Study' })).toBeVisible()

  await page.goto('/works', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Works' })).toBeVisible()
})

test('login page reflects branch auth policy', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' })

  await expect(page.getByRole('link', { name: 'Sign in with Google' })).toBeVisible()

  const shortcut = page.getByRole('link', { name: 'Continue as Local Admin' })
  if (expectedShortcut === 'visible') {
    await expect(shortcut).toBeVisible()
  } else {
    await expect(shortcut).toHaveCount(0)
  }
})
