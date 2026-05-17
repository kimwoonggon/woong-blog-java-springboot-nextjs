import { expect, test } from './helpers/performance-test'

test('hero profile image uses descriptive alt text', async ({ page }) => {
  await page.goto('/')

  const profileImage = page.locator('main img').first()
  await expect(profileImage).toBeVisible()

  const alt = await profileImage.getAttribute('alt')
  expect(alt).toBeTruthy()
  expect(alt).not.toBe('Profile')
  expect(alt?.trim().length).toBeGreaterThan(0)
})
