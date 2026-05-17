import { expect, test } from './helpers/performance-test'

test('contact page does not inject a fallback direct email block', async ({ page }) => {
  await page.goto('/contact')

  await expect(page.getByRole('heading', { name: 'Contact', exact: true })).toBeVisible()
  await expect(page.locator('main')).not.toContainText('Direct email')
  await expect(page.locator('main a[href="mailto:woong@example.com"]')).toHaveCount(0)
})
