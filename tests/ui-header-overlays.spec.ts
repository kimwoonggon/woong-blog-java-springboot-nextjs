import { expect, test, type Locator } from './helpers/performance-test'
import { loginAsLocalAdmin } from './helpers/auth'

type Rect = { left: number; right: number; top: number; bottom: number; width: number; height: number }

const desktopViewport = { width: 1440, height: 900 }

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

test('theme toggle changes theme directly without opening an overlay', async ({ page }) => {
  await page.setViewportSize(desktopViewport)
  await page.goto('/')

  const themeToggle = page.getByTestId('theme-toggle')
  await expect(themeToggle).toBeVisible()
  const triggerBox = await box(themeToggle)

  await themeToggle.click()

  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
  await expect(page.locator('[data-slot="dropdown-menu-content"]')).toHaveCount(0)
  expect(triggerBox.width).toBeGreaterThanOrEqual(44)
  expect(triggerBox.height).toBeGreaterThanOrEqual(44)
})

test('signed-in public header has no account overlay trigger', async ({ page }) => {
  await page.setViewportSize(desktopViewport)
  await loginAsLocalAdmin(page, '/')

  await expect(page.getByText('Signed in')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open signed-in menu' })).toHaveCount(0)
  await expect(page.locator('[data-slot="dropdown-menu-content"]')).toHaveCount(0)
})
