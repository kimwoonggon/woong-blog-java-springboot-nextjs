import { expect, test } from './helpers/performance-test'

test('narrow but tall viewports still use the compact card typography fallback', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 1024 })
  await page.goto('/works')

  const title = page.locator('.responsive-feed-title').first()
  await expect(title).toBeVisible()

  const fontSize = await title.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
  expect(fontSize).toBeLessThanOrEqual(18)
})
