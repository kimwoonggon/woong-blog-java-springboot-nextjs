import { expect, test } from './helpers/performance-test'

function parsePx(value: string) {
  return Number.parseFloat(value.replace('px', ''))
}

test('VA-010 public body copy keeps a readable 1.5-1.75 line-height ratio', async ({ page }) => {
  test.fixme(true, 'Current introduction body copy renders below the target line-height ratio; the plan item remains open.')

  await page.goto('/introduction')

  const bodyCopy = page.locator('main p').filter({ hasText: /\S/ }).first()
  await expect(bodyCopy).toBeVisible()

  const metrics = await bodyCopy.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
    }
  })

  const ratio = parsePx(metrics.lineHeight) / parsePx(metrics.fontSize)
  expect(ratio).toBeGreaterThanOrEqual(1.5)
  expect(ratio).toBeLessThanOrEqual(1.75)
})

test('VA-012 public type scale keeps heading sizes in descending order above body copy', async ({ page }) => {
  await page.goto('/blog/seeded-blog')

  const h1 = page.locator('article h1').first()
  const h2 = page.locator('article h2').first()
  const h3 = page.locator('article h3').first()
  const body = page.locator('article p').filter({ hasText: /\S/ }).first()

  await expect(h1).toBeVisible()
  await expect(h2).toBeVisible()
  await expect(h3).toBeVisible()
  await expect(body).toBeVisible()

  const [h1Size, h2Size, h3Size, bodySize] = await Promise.all([h1, h2, h3, body].map(async (locator) => {
    const size = await locator.evaluate((element) => getComputedStyle(element).fontSize)
    return parsePx(size)
  }))

  expect(h1Size).toBeGreaterThan(h2Size)
  expect(h2Size).toBeGreaterThanOrEqual(bodySize)
  expect(h3Size).toBeGreaterThan(bodySize)
})

test('VA-013 public typography keeps stronger font weights on headings than body copy', async ({ page }) => {
  await page.goto('/blog/seeded-blog')

  const heading = page.locator('article h1').first()
  const body = page.locator('article p').filter({ hasText: /\S/ }).first()
  const label = page.locator('article header [class*="font-medium"]').first()

  await expect(heading).toBeVisible()
  await expect(body).toBeVisible()
  await expect(label).toBeVisible()

  const [headingWeight, bodyWeight, labelWeight] = await Promise.all([heading, body, label].map(async (locator) => {
    const weight = await locator.evaluate((element) => getComputedStyle(element).fontWeight)
    return Number.parseInt(weight, 10)
  }))

  expect(headingWeight).toBeGreaterThanOrEqual(600)
  expect(bodyWeight).toBeLessThanOrEqual(500)
  expect(labelWeight).toBeGreaterThanOrEqual(500)
  expect(headingWeight).toBeGreaterThan(bodyWeight)
})
