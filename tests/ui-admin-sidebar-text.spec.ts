import { expect, test } from './helpers/performance-test'

test('sidebar removes the legacy marketing helper copy', async ({ page }) => {
  await page.goto('/admin/dashboard')

  await expect(page.getByText(/Modernized shortcuts/i)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /admin panel/i })).toBeVisible()
})
