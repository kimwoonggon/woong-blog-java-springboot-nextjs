import { expect, test, type Locator } from './helpers/performance-test'

type Viewport = { width: number; height: number }
type Rect = { left: number; right: number; top: number; bottom: number; width: number; height: number }

const drawerOnlyViewports: Viewport[] = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
]

const desktopInlineNavViewports: Viewport[] = [
  { width: 1920, height: 1080 },
]

async function box(locator: Locator) {
  const rect = await locator.boundingBox()
  expect(rect).toBeTruthy()
  return {
    left: rect!.x,
    right: rect!.x + rect!.width,
    top: rect!.y,
    bottom: rect!.y + rect!.height,
    width: rect!.width,
    height: rect!.height,
  } satisfies Rect
}

test.describe('responsive header', () => {
  for (const viewport of drawerOnlyViewports) {
    test(`uses drawer navigation plus bottom tabs on compact viewports at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')

      const banner = page.getByRole('banner')
      const inlineNav = banner.getByRole('navigation')
      const bottomNav = page.getByTestId('mobile-bottom-nav')
      const menuButton = page.getByRole('button', { name: 'Toggle Menu' })

      await expect(inlineNav).toBeHidden()
      await expect(bottomNav).toBeVisible()
      await expect(menuButton).toBeVisible()

      await menuButton.click()
      const drawer = page.getByRole('dialog')
      await expect(drawer).toBeVisible()

      for (const label of ['Home', 'Introduction', 'Works', 'Study', 'Contact', 'Resume']) {
        await expect(drawer.getByRole('link', { name: label, exact: true })).toBeVisible()
      }
    })
  }

  test('keeps the mobile menu trigger at the left edge with safe spacing', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')

    const brand = page.getByTestId('navbar-brand')
    const menuButton = page.getByRole('button', { name: 'Toggle Menu' })

    const [brandBox, menuBox] = await Promise.all([
      box(brand),
      box(menuButton),
    ])

    expect(menuBox.width).toBeGreaterThanOrEqual(44)
    expect(menuBox.left).toBeGreaterThanOrEqual(8)
    expect(menuBox.right).toBeLessThan(brandBox.left)

    const overflow = await page.locator('header').evaluate((element: HTMLElement) => element.scrollWidth - element.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  for (const viewport of desktopInlineNavViewports) {
    test(`keeps the inline nav non-overlapping at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')

      const banner = page.getByRole('banner')
      const brand = page.getByTestId('navbar-brand')
      const nav = banner.getByRole('navigation')
      const themeToggle = page.getByTestId('theme-toggle')

      await expect(nav).toBeVisible()
      await expect(themeToggle).toBeVisible()
      await expect(page.getByRole('link', { name: 'Login' })).toHaveCount(0)
      await expect(page.getByText('Signed in')).toHaveCount(0)

      for (const label of ['Home', 'Introduction', 'Works', 'Study', 'Contact', 'Resume']) {
        await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible()
      }

      const [brandBox, navBox, themeBox, headerBox] = await Promise.all([
        box(brand),
        box(nav),
        box(themeToggle),
        box(banner),
      ])

      expect(brandBox.right).toBeLessThan(navBox.left)
      expect(navBox.right).toBeLessThan(themeBox.left)
      expect(Math.abs((navBox.left + navBox.right) / 2 - viewport.width / 2)).toBeLessThanOrEqual(24)

      const overflow = await banner.evaluate((element: HTMLElement) => element.scrollWidth - element.clientWidth)
      expect(overflow).toBeLessThanOrEqual(1)
      expect(headerBox.width).toBeGreaterThan(0)
    })
  }
})
