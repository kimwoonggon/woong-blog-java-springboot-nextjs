import { expect, test } from './helpers/performance-test'

function getActiveElementLabel() {
  return document.activeElement?.textContent?.trim()
    || document.activeElement?.getAttribute('aria-label')
    || document.activeElement?.getAttribute('title')
    || document.activeElement?.id
    || ''
}

test('WQ-005 keyboard users can traverse the desktop primary navigation in visual order', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto('/')

  const nav = page.getByRole('banner').getByRole('navigation')
  const orderedLinks = ['Home', 'Introduction', 'Works', 'Study', 'Contact', 'Resume']

  await nav.getByRole('link', { name: orderedLinks[0], exact: true }).focus()

  for (const name of orderedLinks) {
    const link = nav.getByRole('link', { name, exact: true })
    await expect(link).toBeFocused()

    const outlineWidth = await link.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth))
    expect(outlineWidth).toBeGreaterThanOrEqual(2)

    if (name !== orderedLinks[orderedLinks.length - 1]) {
      await page.keyboard.press('Tab')
    }
  }
})
