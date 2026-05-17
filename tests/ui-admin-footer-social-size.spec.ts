import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('VA-304 footer social icons keep 44px touch targets once configured', async ({ page }) => {
  await page.goto('/admin/pages')

  const twitterInput = page.getByLabel('Twitter URL')
  await expect(twitterInput).toBeVisible()
  await twitterInput.fill('https://twitter.com/example')
  await page.getByRole('button', { name: 'Save Changes' }).first().click()

  await page.goto('/')
  const iconLink = page.locator('footer a[aria-label]').first()
  await expect(iconLink).toBeVisible()

  const box = await iconLink.boundingBox()
  expect(box).toBeTruthy()
  expect(box!.width).toBeGreaterThanOrEqual(44)
  expect(box!.height).toBeGreaterThanOrEqual(44)
})
