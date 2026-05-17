import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('Published checkbox stays above the blog editor body area', async ({ page }) => {
  await page.goto('/admin/blog/new')

  const publishedCheckbox = page.getByRole('checkbox', { name: 'Published' })
  const editor = page.locator('.tiptap.ProseMirror').first()

  await expect(publishedCheckbox).toBeVisible()
  await expect(editor).toBeVisible()

  const checkboxBox = await publishedCheckbox.boundingBox()
  const editorBox = await editor.boundingBox()

  expect(checkboxBox).not.toBeNull()
  expect(editorBox).not.toBeNull()
  expect(checkboxBox!.y).toBeLessThan(editorBox!.y)
})
