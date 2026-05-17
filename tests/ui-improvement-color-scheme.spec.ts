import { expect, test } from './helpers/performance-test'
import { expectDarkHtml, getStyle, selectTheme } from './helpers/ui-improvement'

test('light mode sets html color-scheme to light', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')

  await expect.poll(() => getStyle(html, 'color-scheme')).toContain('light')
})

test('dark mode sets html color-scheme to dark', async ({ page }) => {
  await page.goto('/')
  await selectTheme(page, 'Dark')
  await expectDarkHtml(page)

  const html = page.locator('html')
  await expect.poll(() => getStyle(html, 'color-scheme')).toContain('dark')
})
