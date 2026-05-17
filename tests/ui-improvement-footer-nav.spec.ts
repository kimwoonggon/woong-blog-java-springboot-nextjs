import { expect, test } from './helpers/performance-test'

test('footer exposes public navigation links', async ({ page }) => {
  await page.goto('/')

  const footerNav = page.getByRole('navigation', { name: 'Footer navigation' })
  await expect(footerNav).toBeVisible()
  await expect(footerNav.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
  await expect(footerNav.getByRole('link', { name: 'Works' })).toHaveAttribute('href', '/works')
  await expect(footerNav.getByRole('link', { name: 'Study' })).toHaveAttribute('href', '/blog')
})
