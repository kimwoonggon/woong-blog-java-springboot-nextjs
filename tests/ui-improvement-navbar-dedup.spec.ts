import { expect, test } from './helpers/performance-test'

test('navbar no longer renders the duplicate Latest writing link', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Latest writing' })).toHaveCount(0)
})

test('primary Study navigation link still routes to /blog', async ({ page }) => {
  await page.goto('/')

  const studyLink = page.getByRole('link', { name: 'Study', exact: true }).first()
  await expect(studyLink).toBeVisible()
  await studyLink.click()
  await expect(page).toHaveURL(/\/blog$/)
})
