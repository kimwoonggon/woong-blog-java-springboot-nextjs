import { expect, test } from './helpers/performance-test'

test('work detail keeps the first video upfront and folds the rest', async ({ page }) => {
  await page.goto('/works/seeded-work')

  const leadVideo = page.getByTestId('work-lead-video')
  await expect(leadVideo).toBeVisible()

  const moreVideos = page.getByTestId('work-more-videos')
  await expect(moreVideos).toBeVisible()
  await moreVideos.getByText(/More videos/i).click()
  await expect(moreVideos.locator('iframe, video').nth(0)).toBeVisible()
})
