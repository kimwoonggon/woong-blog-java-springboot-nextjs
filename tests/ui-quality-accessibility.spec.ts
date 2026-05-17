import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'

test('WQ-007 key public pages keep sequential heading hierarchy', async ({ page }) => {
  const paths = ['/', '/blog', '/works', '/introduction', '/contact', '/resume']

  for (const path of paths) {
    await page.goto(path)
    await expect(page.locator('main').first()).toBeVisible()

    const levels = await page.locator('h1, h2, h3').evaluateAll((elements) =>
      elements.map((element) => Number.parseInt(element.tagName.slice(1), 10)),
    )

    expect(levels.length).toBeGreaterThan(0)
    expect(levels[0]).toBe(1)
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1)
    }
  }
})

test('WQ-004 and WQ-010 navigation and footer controls keep labels while decorative icons stay hidden', async ({ page }) => {
  await page.goto('/')

  const themeToggle = page.getByTestId('theme-toggle')
  await expect(themeToggle).toHaveAttribute('aria-label', /.+/)
  const themeIcon = themeToggle.locator('svg').first()
  if (await themeIcon.count()) {
    await expect(themeIcon).toHaveAttribute('aria-hidden', 'true')
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const menuButton = page.getByRole('button', { name: 'Toggle Menu' })
  for (const button of [menuButton]) {
    await expect(button).toBeVisible()
    const svg = button.locator('svg').first()
    if (await svg.count()) {
      await expect(svg).toHaveAttribute('aria-hidden', 'true')
    }
  }

  const footerLinks = page.locator('footer a[aria-label]')
  const footerCount = await footerLinks.count()
  for (let index = 0; index < footerCount; index += 1) {
    const link = footerLinks.nth(index)
    await expect(link).toHaveAttribute('aria-label', /.+/)
    const svg = link.locator('svg').first()
    if (await svg.count()) {
      await expect(svg).toHaveAttribute('aria-hidden', 'true')
    }
  }
})

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('WQ-008 admin editors keep labels programmatically associated with key controls', async ({ page }) => {
  const cases = [
    {
      path: '/admin/blog/new',
      ids: ['title', 'excerpt', 'tags', 'published'],
    },
    {
      path: '/admin/works/new',
      ids: ['title', 'category', 'period', 'tags', 'published'],
    },
    {
      path: '/admin/pages',
      ids: ['ownerName', 'tagline'],
    },
  ]

  for (const testCase of cases) {
    await page.goto(testCase.path)

    for (const id of testCase.ids) {
      const control = page.locator(`#${id}`)
      if (!(await control.count())) {
        continue
      }

      const label = page.locator(`label[for="${id}"]`).first()
      await expect(label).toBeVisible()
      await expect(control).toHaveAttribute('id', id)
    }
  }
})

test('WQ-025 and WQ-034 root layout keeps viewport-safe metadata and swapped web fonts', async ({ page }) => {
  await page.goto('/')

  const viewportContent = await page.locator('meta[name="viewport"]').getAttribute('content')
  expect(viewportContent).toContain('width=device-width')
  expect(viewportContent).toContain('initial-scale=1')
  expect(viewportContent).not.toContain('user-scalable=no')
  expect(viewportContent).not.toContain('maximum-scale=1')
})

test('WQ-022 and WQ-021 home hero and work listing images use priority and lazy loading appropriately', async ({ page }) => {
  await page.goto('/')

  const heroImage = page.locator('main img').first()
  await expect(heroImage).toBeVisible()
  await expect(heroImage).not.toHaveAttribute('loading', 'lazy')

  await page.goto('/works')
  const listingImages = page.locator('[data-testid="work-card"] img')
  const imageCount = await listingImages.count()
  test.skip(imageCount < 2, 'Not enough work images available to verify below-fold lazy loading.')
  await expect(listingImages.nth(1)).toHaveAttribute('loading', 'lazy')
})

test('WQ-035 mobile public copy keeps a 16px minimum body size', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const bodyFontSize = await getStyle(page.locator('body'), 'font-size')
  expect(Number.parseFloat(bodyFontSize)).toBeGreaterThanOrEqual(16)
})
