import { expect, test } from './helpers/performance-test'
import type { Page } from './helpers/performance-test'
import { expectRgbClose, getColorChannels, getRootVariableChannels, gotoWithTheme } from './helpers/ui-improvement'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

async function openDarkBlogEditor(page: Page) {
  await gotoWithTheme(page, '/admin/blog')
  await page.getByTestId('admin-blog-row').first().getByRole('link').first().click()
  await expect(page.getByTestId('tiptap-editor-shell')).toBeVisible()
}

test('dark mode tiptap surfaces resolve to semantic background tokens', async ({ page }) => {
  await openDarkBlogEditor(page)

  const toolbar = page.getByTestId('tiptap-toolbar')
  const shell = page.getByTestId('tiptap-editor-shell')
  const surface = page.getByTestId('tiptap-editor-surface')

  await expect(toolbar).toHaveClass(/bg-background\/95/)
  await expect(shell).toHaveClass(/bg-background/)

  const surfaceChannels = await getColorChannels(surface, 'background-color')
  const rootBackgroundChannels = await getRootVariableChannels(page, '--background')

  expectRgbClose(surfaceChannels, rootBackgroundChannels)
})
