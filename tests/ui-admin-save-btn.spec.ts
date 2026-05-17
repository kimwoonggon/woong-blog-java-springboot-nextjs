import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('Blog and Work primary save buttons no longer use the legacy hover-scale styling', async ({ page }) => {
  await page.goto('/admin/blog/new')
  const blogSaveButton = page.getByRole('button', { name: 'Create Post' })
  await expect(blogSaveButton).toBeVisible()
  await expect(blogSaveButton).toHaveAttribute('data-variant', 'default')
  await expect(blogSaveButton).not.toHaveClass(/hover:scale/)
  await expect(blogSaveButton).not.toHaveClass(/bg-brand-navy/)

  await page.goto('/admin/works/new')
  const workSaveButton = page.getByRole('button', { name: 'Create Work' })
  await expect(workSaveButton).toBeVisible()
  await expect(workSaveButton).toHaveAttribute('data-variant', 'default')
  await expect(workSaveButton).not.toHaveClass(/hover:scale/)
  await expect(workSaveButton).not.toHaveClass(/bg-brand-navy/)
})
