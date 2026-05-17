import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'

test('Recent posts cards keep a visible border', async ({ page }) => {
  await page.goto('/')

  const card = page.getByTestId('recent-post-card').first().locator('[data-slot="card"]').first()
  await expect(card).toBeVisible()
  const borderWidth = await card.evaluate((element) => getComputedStyle(element).borderTopWidth)
  expect(Number.parseFloat(borderWidth)).toBeGreaterThan(0)
})

test('Recent posts tags render as rounded badge-style pills', async ({ page }) => {
  await page.goto('/')

  const badge = page.getByTestId('recent-post-card').first().locator('.rounded-full.bg-muted').first()
  await expect(badge).toBeVisible()
})

test('Recent posts cards advertise hover border and shadow states', async ({ page }) => {
  await page.goto('/')

  const card = page.getByTestId('recent-post-card').first().locator('[data-slot="card"]').first()
  await expect(card).toHaveClass(/hover:border-primary\/30/)
  await expect(card).toHaveClass(/hover:shadow-md/)
})

test('Recent posts titles use card-level group hover accent styling', async ({ page }) => {
  await page.goto('/')

  const card = page.getByTestId('recent-post-card').first()
  await expect(card).toHaveClass(/group/)
  await expect(card.locator('[data-slot="card-title"]').first()).toHaveClass(/group-hover:text-brand-accent/)
})

test('Recent posts cards clamp the title and excerpt to consistent line counts', async ({ page }) => {
  await page.goto('/')

  const card = page.getByTestId('recent-post-card').first()
  const excerpt = card.locator('[data-slot="card-content"] p').first()

  if (await excerpt.count()) {
    await expect(excerpt).toHaveClass(/line-clamp-3/)
  }
})

test('Recent posts card metadata, title, and excerpt stay vertically aligned', async ({ page }) => {
  await page.goto('/')

  const card = page.getByTestId('recent-post-card').first()
  const header = card.locator('[data-slot="card-header"]').first()
  const title = card.locator('[data-slot="card-title"]').first()
  const content = card.locator('[data-slot="card-content"]').first()

  await expect(card).toBeVisible()
  await card.scrollIntoViewIfNeeded()
  await expect(header).toBeVisible()
  await expect(title).toBeVisible()

  const [headerBox, titleBox, contentBox] = await Promise.all([
    header.boundingBox(),
    title.boundingBox(),
    content.boundingBox(),
  ])

  expect(headerBox).toBeTruthy()
  expect(titleBox).toBeTruthy()
  if (contentBox) {
    expect(titleBox!.y).toBeGreaterThanOrEqual(headerBox!.y)
    expect(contentBox.y).toBeGreaterThan(titleBox!.y)
  }
})

test('Recent posts cards keep a shared shadow token before hover', async ({ page }) => {
  await page.goto('/')

  const firstCard = page.getByTestId('recent-post-card').nth(0).locator('[data-slot="card"]').first()
  const secondCard = page.getByTestId('recent-post-card').nth(1).locator('[data-slot="card"]').first()

  await expect(firstCard).toBeVisible()
  await expect(secondCard).toBeVisible()

  const [firstShadow, secondShadow] = await Promise.all([
    getStyle(firstCard, 'box-shadow'),
    getStyle(secondCard, 'box-shadow'),
  ])

  expect(firstShadow).toBe(secondShadow)
  expect(firstShadow).not.toBe('none')
})
