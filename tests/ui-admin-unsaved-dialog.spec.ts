import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('VA-233 blog editor shows a warning dialog with keep and discard actions when cancelling dirty changes', async ({ page }) => {
  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(`Unsaved Blog ${Date.now()}`)
  await page.getByRole('button', { name: 'Cancel' }).click()

  const dialog = page.getByTestId('admin-unsaved-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('svg').first()).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Keep editing' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Discard changes' })).toBeVisible()
})

test('VA-233 work editor shows a warning dialog with keep and discard actions when cancelling dirty changes', async ({ page }) => {
  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(`Unsaved Work ${Date.now()}`)
  await page.getByRole('button', { name: 'Cancel' }).click()

  const dialog = page.getByTestId('admin-unsaved-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('svg').first()).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Keep editing' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Discard changes' })).toBeVisible()
})
