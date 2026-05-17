import { expect, test } from './helpers/performance-test'
import { contrastRatio, getColorChannels, gotoWithTheme } from './helpers/ui-improvement'

test('blog detail date badge uses brand navy', async ({ page }) => {
  await page.goto('/blog/seeded-blog')

  const badge = page.locator('article header [data-slot="badge"]').first()
  await expect(badge).toHaveClass(/bg-brand-navy/)
})

test('work detail date badge uses brand navy', async ({ page }) => {
  await page.goto('/works/seeded-work')

  const badge = page.locator('article header [data-slot="badge"]').first()
  await expect(badge).toHaveClass(/bg-brand-navy/)
})

test('dark mode date badges keep accessible white-on-navy contrast', async ({ page }) => {
  await gotoWithTheme(page, '/works/seeded-work')

  const badge = page.locator('article header [data-slot="badge"]').first()
  const background = await getColorChannels(badge, 'background-color')
  const foreground = await getColorChannels(badge, 'color')
  expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
})
