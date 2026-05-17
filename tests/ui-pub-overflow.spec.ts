import { expect, test } from './helpers/performance-test'

const PUBLIC_PATHS = ['/', '/works', '/blog', '/introduction', '/contact', '/resume', '/works/seeded-work', '/blog/seeded-blog']

for (const path of PUBLIC_PATHS) {
  test(`${path} avoids horizontal overflow on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(path)

    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))

    expect(metrics.scrollWidth - metrics.clientWidth).toBeLessThanOrEqual(1)
  })
}
