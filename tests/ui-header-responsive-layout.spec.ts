import { expect, test, type Locator } from './helpers/performance-test'

type Box = { left: number; right: number; top: number; bottom: number }

async function readBox(locator: Locator): Promise<Box> {
  const rect = await locator.boundingBox()
  expect(rect).toBeTruthy()
  return {
    left: rect!.x,
    right: rect!.x + rect!.width,
    top: rect!.y,
    bottom: rect!.y + rect!.height,
  }
}

test('header keeps the public theme action separated on medium desktop widths', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto('/')

  const header = page.locator('header').first()
  const nav = header.locator('nav')
  const themeToggle = page.getByTestId('theme-toggle')

  await expect(nav).toBeVisible()
  await expect(themeToggle).toBeVisible()
  await expect(page.getByRole('link', { name: 'Login' })).toHaveCount(0)
  await expect(page.getByText('Signed in')).toHaveCount(0)

  const navBox = await readBox(nav)
  const themeBox = await readBox(themeToggle)

  expect(navBox.right).toBeLessThanOrEqual(themeBox.left - 16)
})

test('header keeps desktop nav separated from action controls on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 })
  await page.goto('/')

  const header = page.locator('header').first()
  const nav = header.locator('nav')
  const themeToggle = page.getByTestId('theme-toggle')
  const menuButton = page.getByRole('button', { name: 'Toggle Menu' })

  await expect(nav).toBeVisible()
  await expect(themeToggle).toBeVisible()
  await expect(page.getByRole('link', { name: 'Login' })).toHaveCount(0)
  await expect(page.getByText('Signed in')).toHaveCount(0)
  await expect(menuButton).toBeHidden()

  const navBox = await readBox(nav)
  const themeBox = await readBox(themeToggle)

  expect(navBox.right).toBeLessThanOrEqual(themeBox.left - 16)
})
