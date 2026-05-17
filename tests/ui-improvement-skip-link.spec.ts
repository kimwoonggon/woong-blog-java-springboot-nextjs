import { expect, test } from './helpers/performance-test'

test('Tab reveals the skip link and Enter moves focus to main content', async ({ page }) => {
  await page.goto('/')

  const skipLink = page.getByRole('link', { name: 'Skip to main content' })
  await page.keyboard.press('Tab')
  await expect(skipLink).toBeVisible()
  await page.keyboard.press('Enter')

  await expect.poll(() => new URL(page.url()).hash).toBe('#main-content')
  await expect.poll(() =>
    page.evaluate(() => document.activeElement?.id || document.activeElement?.closest('main')?.id || null),
  ).toBe('main-content')
})

test('skip link stays hidden for pointer users before focus', async ({ page }) => {
  await page.goto('/')

  const skipLink = page.getByRole('link', { name: 'Skip to main content' })
  await expect(skipLink).toHaveClass(/sr-only/)

  const box = await skipLink.boundingBox()
  expect(box).toBeTruthy()
  expect(box!.width).toBeLessThanOrEqual(1)
  expect(box!.height).toBeLessThanOrEqual(1)
})
