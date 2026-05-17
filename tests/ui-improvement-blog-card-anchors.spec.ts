import { expect, test } from './helpers/performance-test'
import { contrastRatio, getColorChannels, gotoWithTheme } from './helpers/ui-improvement'

test('blog cards expose date and tag badge anchors', async ({ page }) => {
  await page.goto('/blog?__qaTagged=1')

  const firstCard = page.getByTestId('blog-card').first()
  await expect(firstCard).toBeVisible()
  await expect(firstCard.locator('[data-slot="badge"]').first()).toBeVisible()
  await expect(firstCard.locator('.rounded-full.bg-muted').first()).toBeVisible()
  await expect(firstCard.getByTestId('blog-card-accent-stripe')).toBeVisible()
})

test('blog tag pills keep accessible contrast in dark mode', async ({ page }) => {
  await gotoWithTheme(page, '/blog?__qaTagged=1')

  const tag = page.locator('[data-testid="blog-card"] .rounded-full.bg-muted').first()
  await expect(tag).toBeVisible()

  const foreground = await getColorChannels(tag, 'color')
  const background = await getColorChannels(tag, 'background-color')
  expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
})

test('blog grid uses three columns at xl breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/blog?__qaTagged=1')

  const cards = page.getByTestId('blog-card')
  await expect(cards.nth(2)).toBeVisible()

  const firstRowLefts = await cards.evaluateAll((elements) =>
    elements.slice(0, 3).map((element) => Math.round((element as HTMLElement).getBoundingClientRect().left)),
  )
  const distinctColumnPositions = new Set(firstRowLefts)

  expect(distinctColumnPositions.size).toBe(3)
})
