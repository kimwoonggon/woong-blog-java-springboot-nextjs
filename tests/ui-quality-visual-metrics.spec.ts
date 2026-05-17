import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'
import { getViewportClass, toggleThemeForViewport } from './helpers/responsive-policy'

test('VA-300 and VA-303 navbar stays sticky with backdrop treatment and footer stays visually separated', async ({ page }) => {
  await page.goto('/')

  const header = page.locator('header').first()
  const footer = page.locator('footer')
  await expect(header).toBeVisible()
  await expect(footer).toBeVisible()

  const headerPosition = await getStyle(header, 'position')
  const headerBackdrop = await getStyle(header, 'backdrop-filter')
  const footerBorder = await getStyle(footer, 'border-top-width')

  expect(headerPosition).toBe('sticky')
  expect(headerBackdrop).not.toBe('none')
  expect(Number.parseFloat(footerBorder)).toBeGreaterThan(0)
})

test('VA-302 theme toggle keeps a direct 44px action without popover chrome', async ({ page }) => {
  await page.goto('/')
  const viewportClass = await getViewportClass(page)
  const themeToggle = viewportClass === 'desktop'
    ? page.getByTestId('theme-toggle')
    : page.getByRole('button', { name: 'Toggle Menu' })
  const box = await themeToggle.boundingBox()

  expect(box).toBeTruthy()
  expect(box!.width).toBeGreaterThanOrEqual(44)
  expect(box!.height).toBeGreaterThanOrEqual(44)

  await toggleThemeForViewport(page)

  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
  await expect(page.locator('[data-slot="dropdown-menu-content"]')).toHaveCount(0)
})

test('VA-301 and VA-400 mobile menu sheet keeps motion tokens and overlay styling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Toggle Menu' }).click()

  const overlay = page.locator('[data-slot="sheet-overlay"]').first()
  const content = page.locator('[data-slot="sheet-content"]').first()
  await expect(overlay).toBeVisible()
  await expect(content).toBeVisible()

  const [overlayBackground, duration, timingFunction] = await Promise.all([
    getStyle(overlay, 'background-color'),
    getStyle(content, 'transition-duration'),
    getStyle(content, 'transition-timing-function'),
  ])

  expect(overlayBackground).not.toBe('rgba(0, 0, 0, 0)')
  expect(duration).not.toBe('0s')
  expect(timingFunction).not.toContain('linear')
})

test('VA-305 public pagination keeps minimum touch targets and a differentiated active state', async ({ page }) => {
  await page.goto('/blog')

  const pagination = page.locator('nav[aria-label="Study pagination"]')
  await expect(pagination).toBeVisible()

  const firstLink = pagination.locator('a').first()
  await expect(firstLink).toBeVisible()
  const metrics = await firstLink.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return {
      width: rect.width,
      height: rect.height,
      backgroundColor: style.backgroundColor,
    }
  })

  expect(metrics.height).toBeGreaterThanOrEqual(30)
  expect(metrics.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
})

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('VA-202, VA-210, VA-211, and VA-212 admin navigation and tables keep readable alignment and touch-friendly rows', async ({ page }) => {
  await page.goto('/admin/blog')

  const nav = page.locator('aside nav').first()
  const navButton = nav.getByRole('link', { name: 'Dashboard' })
  await expect(navButton).toBeVisible()
  const navMetrics = await navButton.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { height: rect.height, display: getComputedStyle(element).display }
  })
  expect(navMetrics.height).toBeGreaterThanOrEqual(40)
  expect(navMetrics.display).toBe('flex')

  const searchInput = page.getByRole('textbox', { name: 'Search blog titles' })
  await expect(searchInput).toBeVisible()
  const row = page.getByTestId('admin-blog-row').first()
  await expect(row).toBeVisible()

  const rowHeight = await row.evaluate((element) => element.getBoundingClientRect().height)
  expect(rowHeight).toBeGreaterThanOrEqual(44)
})

test('VA-221 and VA-223 admin editors keep distinct field surfaces and a prominent save button', async ({ page }) => {
  await page.goto('/admin/blog/new')

  const editorShell = page.locator('.space-y-4.rounded-2xl.border').first()
  const saveButton = page.getByRole('button', { name: /Create Post|Update Post/i })
  await expect(editorShell).toBeVisible()
  await expect(saveButton).toBeVisible()

  const [editorBorder, saveBackground] = await Promise.all([
    getStyle(editorShell, 'border-top-width'),
    getStyle(saveButton, 'background-color'),
  ])

  expect(Number.parseFloat(editorBorder)).toBeGreaterThan(0)
  expect(saveBackground).not.toBe('rgba(0, 0, 0, 0)')
})

test('VA-231, VA-232, and VA-404 admin delete dialog uses overlay, elevation, and entry animation tokens', async ({ page }) => {
  await page.goto('/admin/blog')
  await page.getByRole('button', { name: 'Delete' }).first().click()

  const overlay = page.locator('[data-slot="dialog-overlay"]').first()
  const content = page.locator('[data-slot="dialog-content"]').first()
  await expect(overlay).toBeVisible()
  await expect(content).toBeVisible()

  const [overlayBackground, boxShadow, animationDuration, zIndex] = await Promise.all([
    getStyle(overlay, 'background-color'),
    getStyle(content, 'box-shadow'),
    getStyle(content, 'animation-duration'),
    getStyle(content, 'z-index'),
  ])

  expect(overlayBackground).not.toBe('rgba(0, 0, 0, 0)')
  expect(boxShadow).not.toBe('none')
  expect(animationDuration).not.toBe('0s')
  expect(Number.parseInt(zIndex, 10)).toBeGreaterThanOrEqual(50)
})
