import { expect, test } from './helpers/performance-test'
import { getColorChannels, getRootVariableChannels, expectRgbClose } from './helpers/ui-improvement'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('VA-001 primary and destructive surfaces resolve from the shared semantic tokens', async ({ page }) => {
  await page.goto('/admin/blog/new')

  const saveButton = page.getByRole('button', { name: 'Create Post' })
  await expect(saveButton).toBeVisible()
  const primaryBg = await getColorChannels(saveButton, 'background-color')
  const expectedPrimary = await getRootVariableChannels(page, '--primary')
  expectRgbClose(primaryBg, expectedPrimary, 8)

  await page.goto('/admin/blog')
  await page.getByRole('button', { name: 'Delete' }).first().click()
  const destructiveButton = page.getByRole('dialog').getByRole('button', { name: 'Delete' })
  await expect(destructiveButton).toBeVisible()
  const destructiveBg = await getColorChannels(destructiveButton, 'background-color')
  const expectedDestructive = await getRootVariableChannels(page, '--destructive')
  expectRgbClose(destructiveBg, expectedDestructive, 16)
})
