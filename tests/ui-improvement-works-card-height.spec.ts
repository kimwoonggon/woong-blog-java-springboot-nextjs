import { expect, test } from './helpers/performance-test'

test('works cards use a flexible height instead of a fixed 30rem height', async ({ page }) => {
  await page.goto('/works')

  const card = page.getByTestId('work-card').first()
  await expect(card).toBeVisible()
  const height = await card.evaluate((element) => element.getBoundingClientRect().height)

  expect(height).toBeGreaterThanOrEqual(384)
  expect(Math.abs(height - 480)).toBeGreaterThan(8)
})

test('shorter viewports keep the reduced works card min-height', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/works')

  const card = page.getByTestId('work-card').first()
  await expect(card).toBeVisible()
  await expect.poll(
    () => card.evaluate((element) => Math.round(element.getBoundingClientRect().height)),
    { timeout: 10_000 },
  ).toBeGreaterThanOrEqual(320)
})
