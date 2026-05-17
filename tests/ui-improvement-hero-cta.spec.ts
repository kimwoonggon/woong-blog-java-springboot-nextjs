import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'

test('home hero includes View My Works CTA to /works', async ({ page }) => {
  await page.goto('/')

  const cta = page.getByRole('link', { name: 'View My Works' })
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(page).toHaveURL(/\/works$/)
  await expect(page.getByRole('heading', { name: 'Works', exact: true })).toBeVisible()
})

test('home hero includes Read Study CTA to /blog', async ({ page }) => {
  await page.goto('/')

  const cta = page.getByRole('link', { name: 'Read Study' })
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(page).toHaveURL((url) => url.pathname === '/blog')
  await expect(page.getByRole('heading', { name: 'Study', exact: true })).toBeVisible()
})

test('hero CTA buttons remain visible and touch-sized on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')

  const worksCta = page.getByRole('link', { name: 'View My Works' })
  const blogCta = page.getByRole('link', { name: 'Read Study' })

  await expect(worksCta).toBeVisible()
  await expect(blogCta).toBeVisible()

  const worksHeight = await worksCta.evaluate((element) => element.getBoundingClientRect().height)
  const blogHeight = await blogCta.evaluate((element) => element.getBoundingClientRect().height)
  expect(worksHeight).toBeGreaterThanOrEqual(44)
  expect(blogHeight).toBeGreaterThanOrEqual(44)
})

test('hero CTA wrapper becomes immediately visible with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const cta = page.getByRole('link', { name: 'View My Works' })
  const wrapper = cta.locator('xpath=ancestor::div[1]')
  await expect.poll(() => getStyle(wrapper, 'opacity')).toBe('1')
})
