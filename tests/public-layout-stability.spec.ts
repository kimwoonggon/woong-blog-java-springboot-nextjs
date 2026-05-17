import { expect, test, type Locator } from './helpers/performance-test'

interface CardRect {
  top: number
  left: number
  height: number
}

async function getRects(locator: Locator, count = 3) {
  const total = Math.min(await locator.count(), count)
  const rects: CardRect[] = []

  for (let index = 0; index < total; index += 1) {
    const box = await locator.nth(index).boundingBox()
    if (!box) {
      continue
    }

    rects.push({
      top: box.y,
      left: box.x,
      height: box.height,
    })
  }

  return rects
}

test('works and blog listing cards stay aligned in desktop rows', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 })

  await page.goto('/works')
  const worksCards = page.getByTestId('work-card')
  expect(await worksCards.count()).toBeGreaterThanOrEqual(4)
  const workRects = await getRects(worksCards, 3)
  expect(Math.max(...workRects.map((rect) => rect.top)) - Math.min(...workRects.map((rect) => rect.top))).toBeLessThan(4)
  expect(Math.max(...workRects.map((rect) => rect.height)) - Math.min(...workRects.map((rect) => rect.height))).toBeLessThan(4)

  await page.goto('/blog')
  const blogCards = page.getByTestId('blog-card')
  expect(await blogCards.count()).toBeGreaterThanOrEqual(12)
  const blogRects = await getRects(blogCards, 3)
  expect(Math.max(...blogRects.map((rect) => rect.top)) - Math.min(...blogRects.map((rect) => rect.top))).toBeLessThan(4)
})

test('related content cards keep stable desktop rows on detail pages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1400 })

  await page.goto('/works/seeded-work')
  const relatedWorkCards = page.getByTestId('related-work-card')
  await expect(relatedWorkCards.first()).toBeVisible()
  expect(await relatedWorkCards.count()).toBeGreaterThanOrEqual(1)
  const relatedWorkRects = await getRects(relatedWorkCards, 2)
  if (relatedWorkRects.length >= 2) {
    expect(Math.abs(relatedWorkRects[0].top - relatedWorkRects[1].top)).toBeLessThan(4)
  }

  await page.goto('/blog/seeded-blog')
  const relatedBlogCards = page.getByTestId('related-blog-card')
  await expect(relatedBlogCards.first()).toBeVisible()
  expect(await relatedBlogCards.count()).toBeGreaterThanOrEqual(1)
  const relatedBlogRects = await getRects(relatedBlogCards, 2)
  if (relatedBlogRects.length >= 2) {
    expect(Math.abs(relatedBlogRects[0].top - relatedBlogRects[1].top)).toBeLessThan(4)
  }
})

test('works and blog grids collapse to a single mobile column', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto('/works')
  await expect(page.getByTestId('work-card').first()).toBeVisible()
  const worksGridColumns = await page.getByTestId('work-card').first().evaluate((element) => getComputedStyle(element.parentElement as HTMLElement).gridTemplateColumns)
  expect(worksGridColumns.split(' ').length).toBe(1)
  const mobileWorkRects = await getRects(page.getByTestId('work-card'), 2)
  expect(Math.abs(mobileWorkRects[0].left - mobileWorkRects[1].left)).toBeLessThan(4)
  expect(mobileWorkRects[1].top).toBeGreaterThan(mobileWorkRects[0].top)

  await page.goto('/blog')
  await expect(page.getByTestId('blog-card').first()).toBeVisible()
  const blogGridColumns = await page.getByTestId('blog-card').first().evaluate((element) => getComputedStyle(element.parentElement as HTMLElement).gridTemplateColumns)
  expect(blogGridColumns.split(' ').length).toBe(1)
})

test('work and blog detail pages keep related content stacked on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto('/works/seeded-work')
  const workRelatedGridColumns = await page.getByTestId('related-work-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns)
  expect(workRelatedGridColumns.split(' ').length).toBe(1)

  await page.goto('/blog/seeded-blog')
  const blogRelatedGridColumns = await page.getByTestId('related-blog-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns)
  expect(blogRelatedGridColumns.split(' ').length).toBe(1)
})
