import { expect, test } from './helpers/performance-test'

test('works detail exposes previous or next navigation links', async ({ page }) => {
  await page.goto('/works/seeded-work')

  const nav = page.getByTestId('work-prev-next')
  await expect(nav).toBeVisible()

  const links = nav.getByRole('link')
  const linkCount = await links.count()
  expect(linkCount).toBeGreaterThanOrEqual(1)
  expect(linkCount).toBeLessThanOrEqual(2)

  const link = links.first()
  await expect(link).toHaveAttribute('href', /\/works\/.+/)
  await expect(link).toContainText(/Previous|Next/)
})
