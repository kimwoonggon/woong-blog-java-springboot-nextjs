import { expect, test } from './helpers/performance-test'

test('keyboard-focused public links keep a visible focus outline', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/')

  const focused = page.locator('header nav:visible').first().getByRole('link', { name: 'Home', exact: true })
  await focused.focus()
  await expect(focused).toBeFocused()

  const outlineWidth = await focused.evaluate((element) => getComputedStyle(element).outlineWidth)
  expect(Number.parseFloat(outlineWidth)).toBeGreaterThan(0)
})

test('keyboard users can traverse the primary navigation in visual order', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/')

  const nav = page.locator('header nav:visible').first()
  const orderedLinks = ['Home', 'Introduction', 'Works', 'Study', 'Contact', 'Resume']
  const firstLink = nav.getByRole('link', { name: orderedLinks[0], exact: true })
  await firstLink.focus()

  for (const name of orderedLinks) {
    const link = nav.getByRole('link', { name, exact: true })
    await expect(link).toBeFocused()

    const outlineWidth = await link.evaluate((element) => getComputedStyle(element).outlineWidth)
    expect(Number.parseFloat(outlineWidth)).toBeGreaterThanOrEqual(2)

    if (name !== orderedLinks[orderedLinks.length - 1]) {
      await page.keyboard.press('Tab')
    }
  }
})

test('primary home CTAs keep visible focus treatment and accessible touch targets', async ({ page }) => {
  await page.goto('/')

  const primaryCta = page.getByRole('link', { name: 'View My Works' })
  const secondaryCta = page.getByRole('link', { name: 'Read Study' })

  for (const cta of [primaryCta, secondaryCta]) {
    await cta.focus()
    await expect(cta).toBeFocused()

    const metrics = await cta.evaluate((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()

      return {
        outlineWidth: Number.parseFloat(style.outlineWidth),
        height: rect.height,
        width: rect.width,
      }
    })

    expect(metrics.outlineWidth).toBeGreaterThanOrEqual(2)
    expect(metrics.height).toBeGreaterThanOrEqual(44)
    expect(metrics.width).toBeGreaterThanOrEqual(44)
  }
})
