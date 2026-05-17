import { expect, test } from './helpers/performance-test'

test('unknown public routes render the shared 404 page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist')

  await expect(page.getByRole('heading', { name: '404 - Page Not Found' })).toBeVisible()
  await expect(page.getByText('The page you are looking for does not exist or has been deleted.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Return Home' })).toHaveAttribute('href', '/')
})

test('unknown blog slugs render the shared 404 page', async ({ page }) => {
  await page.goto('/blog/this-slug-does-not-exist')

  await expect(page.getByRole('heading', { name: '404 - Page Not Found' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Return Home' })).toHaveAttribute('href', '/')
})

test('unknown work slugs render the shared 404 page', async ({ page }) => {
  await page.goto('/works/this-slug-does-not-exist')

  await expect(page.getByRole('heading', { name: '404 - Page Not Found' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Return Home' })).toHaveAttribute('href', '/')
})
