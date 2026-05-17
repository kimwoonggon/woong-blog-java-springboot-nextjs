import { expect, test } from './helpers/performance-test'

test('dashboard nav item is visually active on /admin/dashboard', async ({ page }) => {
  await page.goto('/admin/dashboard')

  const dashboardLink = page.getByRole('link', { name: /dashboard/i })
  await expect(dashboardLink).toBeVisible()
  await expect(dashboardLink).toHaveClass(/font-semibold/)
  await expect(dashboardLink).toHaveAttribute('aria-current', 'page')
})

test('blog nav item is visually active on /admin/blog', async ({ page }) => {
  await page.goto('/admin/blog')

  const blogLink = page.getByRole('link', { name: /^blog$/i })
  await expect(blogLink).toBeVisible()
  await expect(blogLink).toHaveClass(/font-semibold/)
  await expect(blogLink).toHaveAttribute('aria-current', 'page')
})

test('works nav item stays non-active on /admin/dashboard', async ({ page }) => {
  await page.goto('/admin/dashboard')

  const worksLink = page.getByRole('link', { name: /works/i })
  await expect(worksLink).toBeVisible()
  await expect(worksLink).not.toHaveClass(/font-semibold/)
  await expect(worksLink).not.toHaveAttribute('aria-current', 'page')
})
