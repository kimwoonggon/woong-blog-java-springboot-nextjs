import { expect, test } from './helpers/performance-test'

async function getWidth(page: import('./helpers/performance-test').Page, testId: string) {
  return page.getByTestId(testId).evaluate((element) => element.getBoundingClientRect().width)
}

test('blog detail related content width stays aligned with the reading column', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/blog/seeded-blog')
  await expect(page.getByTestId('related-blog-card').first()).toBeVisible()
  await expect(page.getByTestId('blog-related-shell')).toBeVisible()

  await expect
    .poll(async () => {
      const bodyWidth = await getWidth(page, 'blog-detail-body')
      const relatedWidth = await getWidth(page, 'blog-related-shell')
      return Math.abs(bodyWidth - relatedWidth)
    })
    .toBeLessThanOrEqual(4)
})

test('work detail related content width stays aligned with the reading column', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/works/seeded-work')
  await expect(page.getByTestId('work-related-shell')).toBeVisible()

  await expect
    .poll(async () => {
      const bodyWidth = await getWidth(page, 'work-detail-body')
      const relatedWidth = await getWidth(page, 'work-related-shell')
      return Math.abs(bodyWidth - relatedWidth)
    })
    .toBeLessThanOrEqual(4)
})
