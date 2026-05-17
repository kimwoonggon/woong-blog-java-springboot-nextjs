import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from './helpers/performance-test'

const START_WIDTH = 200
const END_WIDTH = 3800
const STEP = 50
const HEIGHT = 900
const OUTPUT_DIR = process.env.RESPONSIVE_SWEEP_OUTPUT_DIR
  ? path.join(process.env.RESPONSIVE_SWEEP_OUTPUT_DIR)
  : path.join('test-results', 'playwright', 'responsive-width-sweep')

type SweepMetric = {
  width: number
  overflowX: number
  inlineNavVisible: boolean
  menuVisible: boolean
  navCenterOffset: number | null
  brandNavGap: number | null
  navActionGap: number | null
}

test('capture homepage across a full width sweep and record layout metrics', async ({ page }) => {
  test.setTimeout(15 * 60 * 1000)
  await mkdir(OUTPUT_DIR, { recursive: true })

  const metrics: SweepMetric[] = []

  for (let width = START_WIDTH; width <= END_WIDTH; width += STEP) {
    await page.setViewportSize({ width, height: HEIGHT })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Works', exact: true }).waitFor({ state: 'visible' })

    const metric = await page.evaluate(() => {
      const header = document.querySelector('header')
      const brand = document.querySelector('[data-testid="navbar-brand"]')
      const inlineNav = document.querySelector('header nav')
      const themeToggle = document.querySelector('[data-testid="theme-toggle"]')
      const menuButton = Array.from(document.querySelectorAll('header button')).find((button) =>
        button.querySelector('svg.lucide-menu'),
      ) as HTMLElement | undefined

      const overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth

      const navComputed = inlineNav ? window.getComputedStyle(inlineNav) : null
      const inlineNavVisible = Boolean(
        inlineNav &&
          navComputed &&
          navComputed.display !== 'none' &&
          navComputed.visibility !== 'hidden' &&
          (inlineNav as HTMLElement).getBoundingClientRect().width > 0,
      )

      const menuComputed = menuButton ? window.getComputedStyle(menuButton) : null
      const menuVisible = Boolean(
        menuButton &&
          menuComputed &&
          menuComputed.display !== 'none' &&
          menuComputed.visibility !== 'hidden' &&
          menuButton.getBoundingClientRect().width > 0,
      )

      const brandRect = brand?.getBoundingClientRect()
      const navRect = inlineNavVisible ? inlineNav?.getBoundingClientRect() : null
      const themeRect = themeToggle?.getBoundingClientRect()

      return {
        overflowX,
        inlineNavVisible,
        menuVisible,
        navCenterOffset: navRect ? Math.round(Math.abs((navRect.left + navRect.right) / 2 - window.innerWidth / 2)) : null,
        brandNavGap: brandRect && navRect ? Math.round(navRect.left - brandRect.right) : null,
        navActionGap: navRect && themeRect ? Math.round(themeRect.left - navRect.right) : null,
      }
    })

    metrics.push({ width, ...metric })

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `home-width-${String(width).padStart(4, '0')}.png`),
      fullPage: true,
    })
  }

  await writeFile(path.join(OUTPUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2))

  const badOverflow = metrics.filter((entry) => entry.width >= 320 && entry.overflowX > 1)
  expect(
    badOverflow,
    `Horizontal overflow detected at widths >=250px: ${badOverflow.map((entry) => entry.width).join(', ')}`,
  ).toEqual([])
})
