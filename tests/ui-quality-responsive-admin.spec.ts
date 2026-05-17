import { expect, test, type Locator } from './helpers/performance-test'

async function columnCount(locator: Locator) {
  const template = await locator.evaluate((element: HTMLElement) => getComputedStyle(element).gridTemplateColumns)
  return template.split(' ').filter(Boolean).length
}

test('WQ-031 tablet layouts reduce public card grids to two columns', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })

  await page.goto('/')
  await expect(page.getByTestId('featured-work-card').first()).toBeVisible()
  const featuredGrid = page.getByTestId('featured-works-grid')
  expect(await columnCount(featuredGrid)).toBe(2)

  await page.goto('/works')
  await expect(page.getByTestId('work-card').first()).toBeVisible()
  const worksGrid = page.locator('xpath=//div[contains(@class,"grid") and contains(@class,"xl:grid-cols-4")]').first()
  expect(await columnCount(worksGrid)).toBe(2)
})

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('WQ-033 admin sidebar collapses into a stacked top rail on mobile without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/dashboard')

  const aside = page.locator('aside').first()
  const main = page.locator('main').first()
  await expect(aside).toBeVisible()
  await expect(main).toBeVisible()

  const [asideBox, mainBox, overflowX] = await Promise.all([
    aside.boundingBox(),
    main.boundingBox(),
    page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ])

  expect(asideBox).toBeTruthy()
  expect(mainBox).toBeTruthy()
  expect((asideBox?.width ?? 0)).toBeGreaterThanOrEqual(360)
  expect((mainBox?.y ?? 0)).toBeGreaterThan((asideBox?.y ?? 0) + (asideBox?.height ?? 0) - 1)
  expect(overflowX).toBeLessThanOrEqual(1)
})
