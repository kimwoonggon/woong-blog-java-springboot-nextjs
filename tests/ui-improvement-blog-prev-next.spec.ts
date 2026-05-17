import { expect, test } from './helpers/performance-test'

test('blog detail exposes previous or next navigation links', async ({ page }) => {
  await page.goto('/blog/seeded-blog')

  const nav = page.getByTestId('blog-prev-next')
  await expect(nav).toBeVisible()
  expect(await nav.getByRole('link').count()).toBeGreaterThanOrEqual(1)
})
