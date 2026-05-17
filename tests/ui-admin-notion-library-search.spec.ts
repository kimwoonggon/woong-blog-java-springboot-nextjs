import { expect, test } from './helpers/performance-test'

test('library search filters visible notion documents', async ({ page }) => {
  await page.goto('/admin/blog/notion')

  await page.getByTestId('notion-library-trigger').click()
  const searchInput = page.getByPlaceholder('Search posts...')
  await expect(searchInput).toBeVisible()

  const items = page.getByTestId('notion-blog-list-item')
  const initialCount = await items.count()
  test.skip(initialCount < 2, 'Need at least two blog documents for search filtering coverage')

  const secondTitle = await items.nth(1).locator('p').first().textContent()
  const keyword = secondTitle?.trim() ?? ''
  test.skip(!keyword, 'Need searchable text for search coverage')

  await searchInput.fill(keyword)
  await expect(items.first()).toBeVisible()
  const filteredCount = await items.count()
  expect(filteredCount).toBeLessThanOrEqual(initialCount)
  await expect(items.first().locator('p').first()).toContainText(keyword)
})

test('clearing search restores the full notion document list', async ({ page }) => {
  await page.goto('/admin/blog/notion')

  await page.getByTestId('notion-library-trigger').click()
  const searchInput = page.getByPlaceholder('Search posts...')
  const items = page.getByTestId('notion-blog-list-item')
  const initialCount = await items.count()
  test.skip(initialCount < 2, 'Need at least two blog documents for search restore coverage')

  const secondTitle = await items.nth(1).locator('p').first().textContent()
  const keyword = secondTitle?.trim() ?? ''
  test.skip(!keyword, 'Need searchable text for search coverage')

  await searchInput.fill(keyword)
  await expect(items.first()).toBeVisible()
  const filteredCount = await items.count()
  expect(filteredCount).toBeLessThanOrEqual(initialCount)

  await searchInput.fill('')
  await expect(items).toHaveCount(initialCount)
})
