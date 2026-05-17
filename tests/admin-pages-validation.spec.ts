import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('admin pages save fails for overlong introduction title', async ({ page }) => {
  await page.goto('/admin/pages')
  await expect(page).toHaveURL(/\/admin\/pages/)

  await page.locator('input[name="title"]').first().fill('T'.repeat(201))

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/pages') && res.request().method() === 'PUT'),
    page.getByRole('button', { name: 'Save Changes' }).nth(2).click(),
  ])

  expect(response.status()).toBe(400)
  await expect(page).toHaveURL(/\/admin\/pages/)
})
