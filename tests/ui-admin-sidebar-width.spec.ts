import { expect, test } from './helpers/performance-test'

test('admin sidebar width collapses to 256px on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/admin/dashboard')

  const aside = page.locator('aside').first()
  await expect(aside).toBeVisible()

  const width = await aside.evaluate((element) => Math.round(element.getBoundingClientRect().width))
  expect(width).toBe(256)
})

test('admin main content keeps at least 960px on 1280px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/admin/dashboard')

  const main = page.locator('main').first()
  await expect(main).toBeVisible()

  const width = await main.evaluate((element) => Math.round(element.getBoundingClientRect().width))
  expect(width).toBeGreaterThanOrEqual(960)
})
