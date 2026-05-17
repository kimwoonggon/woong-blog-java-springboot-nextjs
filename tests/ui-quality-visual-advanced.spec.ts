import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'

test('VA-010 blog card excerpt keeps a readable line-height ratio and preserves the excerpt clamp', async ({ page }) => {
  await page.goto('/')

  const card = page
    .getByTestId('recent-post-card')
    .filter({ has: page.locator('[data-slot="card-content"] p').filter({ hasText: /\S/ }) })
    .first()
  await expect(card).toBeVisible()

  const title = card.locator('[data-slot="card-title"]').first()
  const excerpt = card.locator('[data-slot="card-content"] p').first()
  await expect(title).toBeVisible()
  await expect(excerpt).toBeVisible()

  const [lineHeight, excerptClamp] = await Promise.all([
    getStyle(excerpt, 'line-height'),
    getStyle(excerpt, '-webkit-line-clamp'),
  ])

  const fontSize = await excerpt.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
  const computedLineHeight = Number.parseFloat(lineHeight)
  const lineHeightRatio = computedLineHeight / fontSize

  expect(lineHeightRatio).toBeGreaterThanOrEqual(1.5)
  expect(lineHeightRatio).toBeLessThanOrEqual(1.75)
  expect(excerptClamp.trim()).toBe('3')
})

test('VA-012 and VA-013 home hero keeps a clear typography scale and weight hierarchy', async ({ page }) => {
  await page.goto('/')

  const heading = page.locator('main h1').first()
  const body = heading.locator('xpath=following-sibling::p[1]')
  await expect(page.getByText('Creative portfolio')).toHaveCount(0)
  await expect(heading).toBeVisible()
  await expect(body).toBeVisible()

  const [headingSize, headingWeight, bodySize, bodyWeight] = await Promise.all([
    getStyle(heading, 'font-size'),
    getStyle(heading, 'font-weight'),
    getStyle(body, 'font-size'),
    getStyle(body, 'font-weight'),
  ])

  expect(Number.parseFloat(headingSize)).toBeGreaterThan(Number.parseFloat(bodySize))
  expect(Number.parseInt(headingWeight, 10)).toBeGreaterThanOrEqual(600)
  expect(Number.parseInt(bodyWeight, 10)).toBeLessThanOrEqual(500)
})

test('VA-120 blog detail table of contents keeps its own surfaced container styling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/blog/seeded-blog')

  const toc = page.getByTestId('blog-toc')
  const body = page.getByTestId('blog-detail-body')
  await expect(toc).toBeVisible()
  await expect(body).toBeVisible()

  const [borderWidth, backgroundColor, boxShadow, bodyBox, tocBox] = await Promise.all([
    getStyle(toc, 'border-top-width'),
    getStyle(toc, 'background-color'),
    getStyle(toc, 'box-shadow'),
    body.boundingBox(),
    toc.boundingBox(),
  ])

  expect(Number.parseFloat(borderWidth)).toBeGreaterThan(0)
  expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(boxShadow).not.toBe('none')
  expect(bodyBox).toBeTruthy()
  expect(tocBox).toBeTruthy()
  expect(bodyBox!.x + bodyBox!.width).toBeLessThanOrEqual(tocBox!.x - 24)
})

test('VA-142 work detail metadata stays visually subordinate to the page title', async ({ page }) => {
  await page.goto('/works')

  const firstCard = page.getByTestId('work-card').first()
  await expect(firstCard).toBeVisible()
  await firstCard.click()

  const title = page.locator('main h1').first()
  const metadataRow = title.locator('xpath=following-sibling::div[1]')
  const category = metadataRow.locator('span').first()
  await expect(title).toBeVisible()
  await expect(metadataRow).toBeVisible()
  await expect(category).toBeVisible()

  const [titleSize, titleWeight, titleColor, metadataSize, metadataWeight, metadataColor] = await Promise.all([
    getStyle(title, 'font-size'),
    getStyle(title, 'font-weight'),
    getStyle(title, 'color'),
    getStyle(category, 'font-size'),
    getStyle(category, 'font-weight'),
    getStyle(category, 'color'),
  ])

  expect(Number.parseFloat(titleSize)).toBeGreaterThan(Number.parseFloat(metadataSize))
  expect(Number.parseInt(titleWeight, 10)).toBeGreaterThanOrEqual(Number.parseInt(metadataWeight, 10))
  expect(titleColor.trim()).not.toBe(metadataColor.trim())
})
