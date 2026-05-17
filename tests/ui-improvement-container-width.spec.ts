import { expect, test } from './helpers/performance-test'

test('home container stays within max-w-7xl on large screens', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

  const container = page.locator('main > div.container.max-w-7xl').first()
  const width = await container.evaluate((element) => element.getBoundingClientRect().width)
  expect(width).toBeLessThanOrEqual(1280)
})

test('home and blog pages share the same container width on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  const homeContainer = page.locator('main > div.container.max-w-7xl').first()
  await expect(homeContainer).toBeVisible()
  const homeWidth = await homeContainer.evaluate((element) => element.getBoundingClientRect().width)

  await page.goto('/blog')
  await expect(page.getByRole('heading', { name: 'Study', exact: true })).toBeVisible()
  const blogContainer = page.locator('main > div.container.max-w-7xl').first()
  await expect(blogContainer).toBeVisible()
  const blogWidth = await blogContainer.evaluate((element) => element.getBoundingClientRect().width)

  expect(Math.abs(homeWidth - blogWidth)).toBeLessThanOrEqual(4)
})

test('home hero intro and static public shells stay within readable line lengths', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.goto('/')
  const studyHeading = page.getByRole('heading', { name: 'Study Notes' })
  await expect(studyHeading).toBeVisible()
  const headingWidth = await studyHeading.evaluate((element) => element.getBoundingClientRect().width)
  expect(headingWidth).toBeLessThanOrEqual(600)

  await page.goto('/introduction')
  const introShell = page.getByTestId('static-public-shell')
  await expect(introShell).toBeVisible()
  const introWidth = await introShell.evaluate((element) => element.getBoundingClientRect().width)
  expect(introWidth).toBeLessThanOrEqual(896)
})

test('public containers stay horizontally centered on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto('/works')

  const container = page.locator('main .container.max-w-7xl').first()
  await expect(container).toBeVisible()
  await expect.poll(async () => (
    container.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return Math.abs(rect.left - (window.innerWidth - rect.right))
    })
  )).toBeLessThanOrEqual(20)
})
