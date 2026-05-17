import { expect, test } from './helpers/performance-test'

async function measureWidth(page: import('./helpers/performance-test').Page, testId: string) {
  return page.getByTestId(testId).evaluate((element) => Math.round(element.getBoundingClientRect().width))
}

test('doc info toggle off expands the notion editor area', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/admin/blog/notion')

  const editorArea = page.getByTestId('notion-editor-area')
  await expect(editorArea).toBeVisible()
  await expect(page.getByTestId('notion-doc-info')).toBeVisible()

  const beforeWidth = await measureWidth(page, 'notion-editor-area')
  await page.getByTestId('notion-doc-info-toggle').click()
  await expect(page.getByTestId('notion-doc-info')).toBeHidden()

  const afterWidth = await measureWidth(page, 'notion-editor-area')
  expect(afterWidth).toBeGreaterThan(beforeWidth)
})

test('doc info toggle on restores the side panel', async ({ page }) => {
  await page.goto('/admin/blog/notion')

  await page.getByTestId('notion-doc-info-toggle').click()
  await expect(page.getByTestId('notion-doc-info')).toBeHidden()

  await page.getByTestId('notion-doc-info-toggle').click()
  await expect(page.getByTestId('notion-doc-info')).toBeVisible()
})
