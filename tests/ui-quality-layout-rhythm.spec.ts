import { expect, test } from './helpers/performance-test'

function px(value: string) {
  return Number.parseFloat(value.replace('px', ''))
}

test('VA-022 home sections keep a consistent vertical rhythm', async ({ page }) => {
  await page.goto('/')

  const sections = [
    page.locator('main > div > section').first(),
    page.getByTestId('featured-works-section'),
    page.getByTestId('recent-posts-section'),
    page.locator('main > div > section').last(),
  ]
  const gaps: number[] = []
  for (let i = 1; i < sections.length; i += 1) {
    await expect(sections[i - 1]).toBeVisible()
    await expect(sections[i]).toBeVisible()
    const [prev, next] = await Promise.all([sections[i - 1].boundingBox(), sections[i].boundingBox()])
    expect(prev).toBeTruthy()
    expect(next).toBeTruthy()
    gaps.push(next!.y - (prev!.y + prev!.height))
  }

  const baseline = gaps[0]
  for (const gap of gaps.slice(1)) {
    expect(Math.abs(gap - baseline)).toBeLessThanOrEqual(16)
  }
})

test('VA-024 featured works grid keeps a consistent gap token', async ({ page }) => {
  await page.goto('/')

  const grid = page.getByTestId('featured-works-grid')
  await expect(grid).toBeVisible()

  const [columnGap, rowGap] = await Promise.all([
    grid.evaluate((element) => getComputedStyle(element).columnGap),
    grid.evaluate((element) => getComputedStyle(element).rowGap),
  ])

  expect(px(columnGap)).toBeGreaterThan(0)
  expect(px(columnGap)).toBe(px(rowGap))
})

test('VA-100 hero text and portrait stay visually balanced on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const hero = page.locator('main > div > section').first()
  const textBlock = hero.locator('div').first()
  const portrait = hero.locator('img, [role="img"]').first()
  await expect(textBlock).toBeVisible()
  await expect(portrait).toBeVisible()

  const [heroBox, textBox, portraitBox] = await Promise.all([
    hero.boundingBox(),
    textBlock.boundingBox(),
    portrait.boundingBox(),
  ])

  expect(heroBox).toBeTruthy()
  expect(textBox).toBeTruthy()
  expect(portraitBox).toBeTruthy()

  const heroCenter = (heroBox!.x + heroBox!.width / 2)
  const textCenter = (textBox!.x + textBox!.width / 2)
  const portraitCenter = (portraitBox!.x + portraitBox!.width / 2)

  expect(textCenter).toBeLessThan(heroCenter)
  expect(portraitCenter).toBeGreaterThan(heroCenter)
  expect(Math.abs((heroCenter - textCenter) - (portraitCenter - heroCenter))).toBeLessThanOrEqual(220)
})
