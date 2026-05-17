import { expect, test } from './helpers/performance-test'

test('sidebar exposes a single View Site link', async ({ page }) => {
  await page.goto('/admin/dashboard')

  const siteLinks = page.locator('aside a').filter({ hasText: /View Site|Public Home|Open Site/i })
  await expect(siteLinks).toHaveCount(1)
  await expect(page.getByRole('link', { name: /view site/i })).toBeVisible()
})

test('View Site opens in a new tab', async ({ page }) => {
  await page.goto('/admin/dashboard')

  const viewSiteLink = page.getByRole('link', { name: /view site/i })
  await expect(viewSiteLink).toHaveAttribute('target', '_blank')
})
