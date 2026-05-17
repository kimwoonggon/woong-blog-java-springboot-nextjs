import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('admin blog table can filter by tag', async ({ page }) => {
  await page.goto('/admin/blog')

  const rows = page.getByTestId('admin-blog-row')
  test.skip((await rows.count()) === 0, 'No blog rows available')

  const visibleTagBadges = rows.locator('td:nth-child(5) [data-slot="badge"]')
  const tagTexts = (await visibleTagBadges.allTextContents())
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && !tag.startsWith('+'))
  const searchTag = tagTexts.find(Boolean)

  test.skip(!searchTag, 'No blog tags available to verify tag search')

  await page.getByLabel('Search blog titles').fill(searchTag!)

  const filteredRows = page.getByTestId('admin-blog-row')
  await expect(filteredRows.first()).toBeVisible()

  const visibleTagCells = await filteredRows.locator('td:nth-child(5)').allTextContents()
  expect(visibleTagCells.every((cell) => cell.toLowerCase().includes(searchTag!.toLowerCase()))).toBeTruthy()
})

test('admin works table can filter by category', async ({ page }) => {
  await page.goto('/admin/works')

  const rows = page.getByTestId('admin-work-row')
  test.skip((await rows.count()) === 0, 'No work rows available')

  const categoryCells = await rows.locator('td:nth-child(6)').allTextContents()
  const searchCategory = categoryCells.map((value) => value.trim()).find(Boolean)

  test.skip(!searchCategory, 'No work categories available to verify category search')

  await page.getByLabel('Search work titles').fill(searchCategory!)

  const filteredRows = page.getByTestId('admin-work-row')
  await expect(filteredRows.first()).toBeVisible()
  await expect(filteredRows.locator('td:nth-child(6)').filter({ hasText: searchCategory! }).first()).toBeVisible()
})
