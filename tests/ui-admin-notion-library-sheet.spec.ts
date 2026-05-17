import { expect, test } from './helpers/performance-test'

test('notion view does not expose the library panel by default', async ({ page }) => {
  await page.goto('/admin/blog/notion')

  await expect(page.getByRole('heading', { name: 'Blog Notion View' }).first()).toBeVisible()
  await expect(page.getByTestId('notion-library-trigger')).toBeVisible()
  await expect(page.getByTestId('notion-library-sheet')).toBeHidden()
})

test('library button opens sheet and exposes blog list', async ({ page }) => {
  await page.goto('/admin/blog/notion')

  await page.getByTestId('notion-library-trigger').click()
  await expect(page.getByTestId('notion-library-sheet')).toBeVisible()
  await page.waitForTimeout(500)
  const listItems = page.getByTestId('notion-blog-list-item')
  const itemCount = await listItems.count()
  test.skip(itemCount < 1, 'No notion-linked blog list items are available in this environment.')
  await expect(listItems.first()).toBeVisible()
})

test('selecting a document closes the sheet and keeps editor visible', async ({ page }) => {
  await page.goto('/admin/blog/notion')

  await page.getByTestId('notion-library-trigger').click()
  await page.waitForTimeout(500)
  const listItems = page.getByTestId('notion-blog-list-item')
  const itemCount = await listItems.count()
  test.skip(itemCount < 1, 'No notion-linked blog list items are available in this environment.')
  const firstItem = listItems.first()
  await firstItem.click()

  await expect(page.getByTestId('notion-library-sheet')).toBeHidden()
  await expect(page.locator('.tiptap.ProseMirror').first()).toBeVisible()
})

test('editor shell keeps at least 80 percent of the viewport width on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/admin/blog/notion')

  const editorShell = page.getByTestId('notion-editor-shell')
  await expect(editorShell).toBeVisible()

  await expect.poll(
    () => editorShell.evaluate((element) => Math.round(element.getBoundingClientRect().width)),
    { timeout: 10_000 },
  ).toBeGreaterThanOrEqual(1024)
})
