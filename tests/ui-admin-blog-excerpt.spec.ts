import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('BlogEditor exposes an excerpt field with a live character counter', async ({ page }) => {
  const excerpt = 'x'.repeat(50)

  await page.goto('/admin/blog/new')

  await expect(page.getByLabel('Excerpt')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create Post' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Save changes from top action bar' })).toHaveCount(0)
  await expect(page.getByTestId('blog-editor-workspace')).toHaveCSS('resize', 'horizontal')
  await page.getByLabel('Excerpt').fill(excerpt)
  await expect(page.getByText('50/200')).toBeVisible()
})
