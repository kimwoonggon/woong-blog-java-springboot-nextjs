import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'

test('reduced motion disables fade-in-up animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const heroHeading = page.getByRole('heading', { level: 1 }).first()
  await expect(heroHeading).toBeVisible()
  await expect.poll(() => getStyle(heroHeading, 'opacity')).toBe('1')
  await expect.poll(() => getStyle(heroHeading, 'transform')).toBe('none')

  await page.goto('/works')
  const worksHeading = page.getByRole('heading', { name: 'Works', exact: true })
  await expect(worksHeading).toBeVisible()
  await expect.poll(() => getStyle(worksHeading, 'opacity')).toBe('1')
})

test('default motion keeps the animation class on hero content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')

  const heroHeading = page.getByRole('heading', { level: 1 }).first()
  await expect(heroHeading).toHaveClass(/animate-fade-in-up/)
})
