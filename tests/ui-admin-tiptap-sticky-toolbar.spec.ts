import { expect, test } from './helpers/performance-test'
import type { Page } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

async function openBlogEditor(page: Page) {
  await page.goto('/admin/blog')
  const editLink = page.getByTestId('admin-blog-row').first().getByRole('link').first()
  await expect(editLink).toHaveAttribute('href', /\/admin\/blog\/[^?]+/)
  const href = await editLink.getAttribute('href')
  expect(href).toBeTruthy()
  await page.goto(href!)
  await expect(page.locator('.tiptap.ProseMirror').first()).toBeVisible()
  await expect.poll(() => page.evaluate(() => {
    const target = window as typeof window & { __WOONG_TIPTAP_EDITOR__?: { commands?: { setContent?: (value: string) => void } } }
    return Boolean(target.__WOONG_TIPTAP_EDITOR__?.commands?.setContent)
  })).toBe(true)
}

test('editor toolbar stays pinned while scrolling long content', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 })
  await openBlogEditor(page)

  await page.evaluate(() => {
    const target = window as typeof window & { __WOONG_TIPTAP_EDITOR__?: { commands?: { setContent?: (value: string) => void } } }
    const longHtml = Array.from({ length: 80 }, (_, index) => (
      `<p>Sticky toolbar paragraph ${index} ${'content '.repeat(24)}</p>`
    )).join('')

    target.__WOONG_TIPTAP_EDITOR__?.commands?.setContent?.(longHtml)
  })

  const toolbar = page.getByTestId('tiptap-toolbar')
  const boldButton = toolbar.getByRole('button', { name: 'Bold' })

  await expect(toolbar).toBeVisible()
  await expect(boldButton).toBeVisible()

  const topBeforeScroll = await toolbar.evaluate((element) => Math.round(element.getBoundingClientRect().top))
  expect(topBeforeScroll).toBeGreaterThan(100)

  await page.evaluate(() => {
    window.scrollTo(0, 900)
  })

  await expect.poll(async () => {
    return toolbar.evaluate((element) => Math.round(element.getBoundingClientRect().top))
  }).toBeLessThanOrEqual(4)
  await expect(boldButton).toBeVisible()
})
