import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('AF-013 shows the dashboard error panel when stats loading fails', async ({ page }) => {
  await page.goto('/admin/dashboard?__qaSummaryFail=1')

  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dashboard data is unavailable' })).toBeVisible()
  await expect(page.getByText('The admin dashboard could not be loaded. Please refresh or try again after the backend is healthy.')).toBeVisible()
  await expect(page.getByText('Total Views')).toHaveCount(0)
  await expect(page.getByText('Total Works')).toHaveCount(0)
  await expect(page.getByText('Total Blog Posts')).toHaveCount(0)
})

test('AF-013 shows the dashboard collections fallback when work and blog lists fail', async ({ page }) => {
  await page.goto('/admin/dashboard?__qaCollectionsFail=1')

  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await expect(page.getByText('Total Views')).toBeVisible()
  await expect(page.getByText('Total Works')).toBeVisible()
  await expect(page.getByText('Total Blog Posts')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dashboard content lists are unavailable' })).toBeVisible()
  await expect(page.getByText('Works or blog posts could not be loaded for the dashboard. Please retry after checking the API and database connection.')).toBeVisible()
  await expect(page.getByTestId('works-card-link')).toHaveCount(0)
  await expect(page.getByTestId('blog-posts-card-link')).toHaveCount(0)
})
