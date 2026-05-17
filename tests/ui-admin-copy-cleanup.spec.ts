import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('admin blog list uses concise management copy', async ({ page }) => {
  await page.goto('/admin/blog')

  await expect(page.getByRole('heading', { name: 'Blog Posts' })).toBeVisible()
  await expect(page.getByText('Manage all blog posts. Click a title to edit.', { exact: true })).toBeVisible()
  await expect(page.getByText(/Titles now act as primary edit links/i)).toHaveCount(0)
})

test('admin works list uses concise management copy', async ({ page }) => {
  await page.goto('/admin/works')

  await expect(page.getByRole('heading', { name: 'Works' })).toBeVisible()
  await expect(page.getByText('Manage all portfolio works.', { exact: true })).toBeVisible()
  await expect(page.getByText(/Click a title to edit directly, or create a new work/i)).toHaveCount(0)
})
