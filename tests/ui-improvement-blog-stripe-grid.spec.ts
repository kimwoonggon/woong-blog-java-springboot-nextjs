import { expect, test } from './helpers/performance-test'
test('blog cards expose the accent stripe visual anchor', async ({ page }) => {
  await page.goto('/blog')

  const firstCard = page.getByTestId('blog-card').first()
  await expect(firstCard).toBeVisible()
  await expect(firstCard.getByTestId('blog-card-accent-stripe')).toBeVisible()
})

test('blog grid uses three columns on xl desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/blog')

  const cards = page.getByTestId('blog-card')
  await expect(cards.nth(2)).toBeVisible()

  await expect.poll(async () => {
    const layout = await cards.evaluateAll((elements) =>
      elements.slice(0, 6).map((element) => {
        const box = (element as HTMLElement).getBoundingClientRect()
        return {
          left: Math.round(box.left),
          top: Math.round(box.top),
        }
      }),
    )

    if (layout.length < 3) {
      return 0
    }

    const firstRowTop = Math.min(...layout.map((item) => item.top))
    const firstRow = layout.filter((item) => Math.abs(item.top - firstRowTop) <= 2)
    return new Set(firstRow.map((item) => item.left)).size
  }, { timeout: 15_000 }).toBeGreaterThanOrEqual(3)
})
