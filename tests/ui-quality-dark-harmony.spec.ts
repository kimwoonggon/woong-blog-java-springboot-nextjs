import { expect, test } from './helpers/performance-test'
import { getColorChannels, gotoWithTheme, rgbToLuminance } from './helpers/ui-improvement'

test('VA-002 dark mode keeps body, section, and card surfaces tonally separated', async ({ page }) => {
  await gotoWithTheme(page, '/')

  const body = page.locator('body')
  const main = page.locator('#main-content')
  const featured = main.getByTestId('featured-works-section').first()
  const recent = main.getByTestId('recent-posts-section').first()

  await expect(featured).toBeVisible()
  await expect(recent).toBeVisible()

  const [bodyColor, featuredColor, recentColor] = await Promise.all([
    getColorChannels(body, 'background-color'),
    getColorChannels(featured, 'background-color'),
    getColorChannels(recent, 'background-color'),
  ])

  const bodyLum = rgbToLuminance([bodyColor[0], bodyColor[1], bodyColor[2]])
  const featuredLum = rgbToLuminance([featuredColor[0], featuredColor[1], featuredColor[2]])
  const recentLum = rgbToLuminance([recentColor[0], recentColor[1], recentColor[2]])

  expect(featuredLum).toBeGreaterThan(bodyLum)
  expect(recentLum).toBeGreaterThan(bodyLum)
  expect(`${bodyColor.slice(0, 3)}`).not.toBe(`${featuredColor.slice(0, 3)}`)
  expect(`${bodyColor.slice(0, 3)}`).not.toBe(`${recentColor.slice(0, 3)}`)
})
