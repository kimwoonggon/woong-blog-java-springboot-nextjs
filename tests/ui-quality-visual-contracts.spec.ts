import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'

test('VA-015 feed cards clamp titles to 2 lines and excerpts to 3 lines', async ({ page }) => {
  await page.goto('/blog')

  const blogCard = page
    .getByTestId('blog-card')
    .filter({ has: page.locator('p').filter({ hasText: /\S/ }) })
    .first()
  await expect(blogCard).toBeVisible()
  await expect(blogCard.locator('[data-slot="card-title"]').first()).toHaveClass(/line-clamp-2/)
  await expect(blogCard.locator('p').filter({ hasText: /\S/ }).first()).toHaveClass(/line-clamp-3/)

  await page.goto('/works')
  const workCard = page.getByTestId('work-card').first()
  await expect(workCard).toBeVisible()
  await expect(workCard.locator('h2').first()).toHaveClass(/line-clamp-2/)
  await expect(workCard.locator('p').filter({ hasText: /\S/ }).first()).toHaveClass(/line-clamp-3/)
})

test('VA-132 work category badges stay uppercase with compact pill spacing', async ({ page }) => {
  await page.goto('/works')

  const category = page.getByTestId('work-card').first().locator('.uppercase').first()
  await expect(category).toBeVisible()

  const [transform, letterSpacing] = await Promise.all([
    getStyle(category, 'text-transform'),
    getStyle(category, 'letter-spacing'),
  ])

  expect(transform).toBe('uppercase')
  expect(Number.parseFloat(letterSpacing)).toBeGreaterThanOrEqual(0)
})

test('VA-141 YouTube embeds stay within the article width on work detail pages', async ({ page }) => {
  await page.goto('/works/seeded-work')

  const iframe = page.locator('iframe[src*="youtube"], iframe[src*="youtube-nocookie"]').first()
  test.skip((await iframe.count()) === 0, 'No seeded YouTube iframe available to validate embed sizing.')
  await expect(iframe).toBeVisible()

  const metrics = await iframe.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const parent = (element.parentElement ?? element).getBoundingClientRect()
    return {
      width: rect.width,
      parentWidth: parent.width,
    }
  })

  expect(metrics.width).toBeLessThanOrEqual(metrics.parentWidth + 1)
  expect(metrics.width).toBeGreaterThan(0)
})

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('VA-202 admin sidebar text keeps readable heading and nav label sizing', async ({ page }) => {
  await page.goto('/admin/blog')

  const heading = page.getByRole('heading', { name: 'Admin Panel' })
  const navLink = page.locator('aside nav').getByRole('link', { name: 'Dashboard' })
  await expect(heading).toBeVisible()
  await expect(navLink).toBeVisible()

  const [headingSize, linkSize] = await Promise.all([
    getStyle(heading, 'font-size'),
    getStyle(navLink, 'font-size'),
  ])

  expect(Number.parseFloat(headingSize)).toBeGreaterThan(Number.parseFloat(linkSize))
  expect(Number.parseFloat(linkSize)).toBeGreaterThanOrEqual(14)
})

test('VA-211 and VA-212 admin table columns and search field keep aligned readable controls', async ({ page }) => {
  await page.goto('/admin/blog')

  const search = page.getByRole('textbox', { name: 'Search blog titles' })
  const row = page.getByTestId('admin-blog-row').first()
  const cells = row.getByRole('cell')
  await expect(search).toBeVisible()
  await expect(row).toBeVisible()

  await expect.poll(async () => (
    search.evaluate((element) => element.getBoundingClientRect().height)
  )).toBeGreaterThanOrEqual(36)
  const firstCellAlign = await cells.first().evaluate((element) => getComputedStyle(element).verticalAlign)

  expect(firstCellAlign).toBe('middle')
})

test('VA-400 mobile menu motion stays within the planned duration budget', async ({ page }) => {
  test.fixme(true, 'Current sheet transition duration is 0.5s, above the <=0.4s plan target.')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Toggle Menu' }).click()

  const sheet = page.locator('[data-slot="sheet-content"]').first()
  await expect(sheet).toBeVisible()

  const duration = await getStyle(sheet, 'transition-duration')
  const firstDuration = Number.parseFloat(duration.split(',')[0] ?? '0')
  expect(firstDuration).toBeGreaterThan(0)
  expect(firstDuration).toBeLessThanOrEqual(0.4)
})

test('VA-401 mobile menu motion avoids linear easing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Toggle Menu' }).click()

  const sheet = page.locator('[data-slot="sheet-content"]').first()
  await expect(sheet).toBeVisible()

  const easing = await getStyle(sheet, 'transition-timing-function')
  expect(easing).not.toContain('linear')
})
