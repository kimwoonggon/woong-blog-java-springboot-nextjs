import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('work editor exposes structured metadata controls instead of raw json', async ({ page }) => {
  await page.goto('/admin/works/new')
  await expect(page).toHaveURL(/\/admin\/works\/new/)

  await page.getByRole('tab', { name: 'Media & Videos' }).click()
  await expect(page.getByRole('heading', { name: 'Flexible Metadata' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Field' })).toBeVisible()
  await expect(page.locator('#work-editor-media-section textarea')).toHaveCount(0)
})

test('work editor shows save failure for missing required fields', async ({ page }) => {
  await page.goto('/admin/works/new')
  await expect(page).toHaveURL(/\/admin\/works\/new/)

  await expect(page.getByRole('button', { name: 'Create Work' })).toBeDisabled()
  await expect(page).toHaveURL(/\/admin\/works\/new/)
})
