import { expect, test } from './helpers/performance-test'

test('introduction and contact pages keep the public reading layout', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })

  await page.goto('/introduction')
  await expect(page.locator('main h1').first()).toBeVisible()
  const introWidth = await page.getByTestId('static-public-shell').evaluate((element) => element.getBoundingClientRect().width)
  expect(introWidth).toBeLessThanOrEqual(896)

  await page.goto('/contact')
  await expect(page.locator('main h1').first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText('Direct email')
  const contactWidth = await page.getByTestId('static-public-shell').evaluate((element) => element.getBoundingClientRect().width)
  expect(contactWidth).toBeLessThanOrEqual(896)
})

test('resume page keeps a tall viewer shell without clipping the document area', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/resume')

  await expect(page.locator('main h1').first()).toBeVisible()
  const shellHeight = await page.getByTestId('resume-shell').evaluate((element) => element.getBoundingClientRect().height)
  expect(shellHeight).toBeGreaterThanOrEqual(540)
})

test('static public pages keep a clean unframed header pattern', async ({ page }) => {
  const cases = [
    { path: '/introduction', heading: null },
    { path: '/contact', heading: 'Contact' },
    { path: '/resume', heading: 'Resume' },
  ]

  for (const item of cases) {
    await page.goto(item.path)

    const header = page.locator('main header').first()
    await expect(header).toBeVisible()
    if (item.heading) {
      await expect(header.locator('h1').first()).toHaveText(item.heading)
    } else {
      await expect(header.locator('h1').first()).toBeVisible()
    }
    await expect(header.locator('p').first()).toHaveCount(0)

    const metrics = await header.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        borderTopWidth: Number.parseFloat(style.borderTopWidth),
        boxShadow: style.boxShadow,
      }
    })

    expect(metrics.borderTopWidth).toBe(0)
    expect(metrics.boxShadow).toBe('none')
  }
})
