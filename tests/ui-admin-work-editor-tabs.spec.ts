import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('WorkEditor exposes General, Media & Videos, and Content tabs', async ({ page }) => {
  await page.goto('/admin/works/new')

  await expect(page.getByRole('tab', { name: 'General' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Media & Videos' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Content' })).toBeVisible()
})

test('tab navigation reveals the expected work editor sections and preserves entered data', async ({ page }) => {
  const title = `Tabbed work ${Date.now()}`

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)

  await page.getByRole('tab', { name: 'Media & Videos' }).click()
  await expect(page.locator('#work-thumbnail-upload')).toBeVisible()

  await page.getByRole('tab', { name: 'Content' }).click()
  await expect(page.locator('.tiptap.ProseMirror').first()).toBeVisible()

  await page.getByRole('tab', { name: 'General' }).click()
  await expect(page.getByLabel('Title')).toHaveValue(title)
})
