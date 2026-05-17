import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'

test('VA-305 public pagination controls keep 44px touch targets', async ({ page }) => {
  await page.goto('/blog?page=2&pageSize=2')

  const pagination = page.locator('nav[aria-label="Study pagination"]')
  await expect(pagination).toBeVisible()

  const interactiveLinks = pagination.locator('a')
  const linkCount = await interactiveLinks.count()
  test.skip(linkCount < 2, 'Need at least two interactive pagination links for touch-target checks.')

  for (const target of [interactiveLinks.nth(0), interactiveLinks.nth(1)]) {
    await expect(target).toBeVisible()
    const box = await target.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
})

test('VA-400 and VA-401 mobile sheet motion stays under 400ms and avoids linear easing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Toggle Menu' }).click()

  const sheet = page.locator('[data-slot="sheet-content"]').first()
  await expect(sheet).toBeVisible()

  const [duration, easing] = await Promise.all([
    getStyle(sheet, 'transition-duration'),
    getStyle(sheet, 'transition-timing-function'),
  ])

  const firstDuration = Number.parseFloat(duration.split(',')[0] ?? '0')
  expect(firstDuration).toBeGreaterThan(0)
  expect(firstDuration).toBeLessThanOrEqual(0.4)
  expect(easing).not.toContain('linear')
})

test('VA-405 home sections reveal with increasing fade-in delays', async ({ page }) => {
  await page.goto('/')

  const hero = page.locator('main > div > section').nth(0)
  const featured = page.getByTestId('featured-works-section')
  const recent = page.getByTestId('recent-posts-section')

  await expect(hero).toHaveClass(/animate-fade-in-up/)
  await expect(featured).toHaveClass(/animate-fade-in-up/)
  await expect(recent).toHaveClass(/animate-fade-in-up/)

  const [heroDelay, featuredDelay, recentDelay] = await Promise.all([
    hero.evaluate((element) => (element as HTMLElement).style.animationDelay),
    featured.evaluate((element) => (element as HTMLElement).style.animationDelay),
    recent.evaluate((element) => (element as HTMLElement).style.animationDelay),
  ])

  expect(Number.parseInt(heroDelay, 10)).toBeLessThan(Number.parseInt(featuredDelay, 10))
  expect(Number.parseInt(featuredDelay, 10)).toBeLessThan(Number.parseInt(recentDelay, 10))
})
