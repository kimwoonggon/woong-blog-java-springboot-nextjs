import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('structured metadata fields can be added and removed without raw JSON editing', async ({ page }) => {
  await page.goto('/admin/works/new')
  await page.getByRole('tab', { name: 'Media & Videos' }).click()

  await page.getByRole('button', { name: 'Add Field' }).click()
  const keyInput = page.locator('input[id^="metadata-key-"]').first()
  const valueInput = page.locator('input[id^="metadata-value-"]').first()

  await keyInput.fill('role')
  await valueInput.fill('Lead Frontend Engineer')
  await expect(keyInput).toHaveValue('role')
  await expect(valueInput).toHaveValue('Lead Frontend Engineer')

  await page.getByRole('button', { name: /Remove metadata field 1/i }).click()
  await expect(page.locator('input[id^="metadata-key-"]')).toHaveCount(0)
  await expect(page.locator('input[id^="metadata-value-"]')).toHaveCount(0)
})

test('Media tab no longer renders a raw JSON textarea for flexible metadata', async ({ page }) => {
  await page.goto('/admin/works/new')
  await page.getByRole('tab', { name: 'Media & Videos' }).click()

  await expect(page.locator('#work-editor-media-section textarea')).toHaveCount(0)
})
