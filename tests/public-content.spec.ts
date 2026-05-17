import { expect, test } from './helpers/performance-test'

test('works and blog pages render headings', async ({ page }) => {
  await page.goto('/works')
  await expect(page.getByRole('heading', { name: 'Works', exact: true })).toBeVisible()

  await page.goto('/blog')
  await expect(page.getByRole('heading', { name: 'Study', exact: true })).toBeVisible()
})
