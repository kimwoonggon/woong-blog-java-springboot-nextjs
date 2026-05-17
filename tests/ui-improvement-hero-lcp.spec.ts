import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'

test('hero heading is visible within one second', async ({ page }) => {
  await page.goto('/')
  const heading = page.getByRole('heading', { level: 1 }).first()

  await page.waitForTimeout(1000)
  await expect(heading).toBeVisible()

  const opacity = Number.parseFloat(await getStyle(heading, 'opacity'))
  expect(opacity).toBeGreaterThan(0)
})

test('reduced motion makes hero content immediately visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const heading = page.getByRole('heading', { level: 1 }).first()
  await page.waitForTimeout(100)
  await expect.poll(() => getStyle(heading, 'opacity')).toBe('1')
})
