import { expect, test, type Locator, type Page } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

function uniqueLabel(prefix: string) {
  return `${prefix} ${Date.now()} ${Math.floor(Math.random() * 1000)}`
}

async function fillEditor(page: Page, value: string) {
  const editor = page.locator('.tiptap.ProseMirror').first()
  await editor.click()
  await editor.fill(value)
}

async function createBlog(page: Page, title: string, tags: string) {
  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Tags (comma separated)').fill(tags)
  await fillEditor(page, `Regression coverage body for ${title}`)

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: /Create Post/i }).click(),
  ])
}

async function createWork(page: Page, title: string) {
  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('regression')
  await fillEditor(page, `Regression coverage body for ${title}`)

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])
}

async function getColumnIndex(page: Page, headerName: string) {
  const headers = await page.locator('thead th').allInnerTexts()
  const index = headers.findIndex((value) => value.trim() === headerName)
  expect(index, `Expected "${headerName}" column to exist.`).toBeGreaterThanOrEqual(0)
  return index
}

async function getCellByHeader(row: Locator, page: Page, headerName: string) {
  const index = await getColumnIndex(page, headerName)
  return row.locator('td').nth(index)
}

async function expectCompactPagination(page: Page) {
  await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible()
  await expect(page.getByText(/^Page \d+ of \d+$/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'First' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Last' })).toHaveCount(0)
}

test('admin blog list renders short tag lists as separate badges', async ({ page }) => {
  const title = uniqueLabel('Admin Blog Badges')
  await createBlog(page, title, 'alpha, beta')

  await page.goto('/admin/blog')
  await page.getByLabel('Search blog titles').fill(title)

  const row = page.getByTestId('admin-blog-row').filter({ has: page.getByRole('link', { name: title }) }).first()
  await expect(row).toBeVisible()

  const tagsCell = await getCellByHeader(row, page, 'Tags')
  await expect(tagsCell.locator('[data-slot="badge"]')).toHaveCount(2)
  await expect(tagsCell.locator('[data-slot="badge"]').nth(0)).toHaveText('alpha')
  await expect(tagsCell.locator('[data-slot="badge"]').nth(1)).toHaveText('beta')
  await expect(tagsCell).not.toContainText(',')
})

test('admin blog list collapses extra tags into an overflow badge', async ({ page }) => {
  const title = uniqueLabel('Admin Blog Overflow')
  await createBlog(page, title, 'alpha, beta, gamma, delta, epsilon')

  await page.goto('/admin/blog')
  await page.getByLabel('Search blog titles').fill(title)

  const row = page.getByTestId('admin-blog-row').filter({ has: page.getByRole('link', { name: title }) }).first()
  await expect(row).toBeVisible()

  const tagsCell = await getCellByHeader(row, page, 'Tags')
  await expect(tagsCell.locator('[data-slot="badge"]')).toHaveCount(4)
  await expect(tagsCell.locator('[data-slot="badge"]').nth(0)).toHaveText('alpha')
  await expect(tagsCell.locator('[data-slot="badge"]').nth(1)).toHaveText('beta')
  await expect(tagsCell.locator('[data-slot="badge"]').nth(2)).toHaveText('gamma')
  await expect(tagsCell.locator('[data-slot="badge"]').nth(3)).toHaveText('+2')
  await expect(tagsCell).not.toContainText('delta')
  await expect(tagsCell).not.toContainText('epsilon')
})

test('admin works list includes a thumbnail column', async ({ page }) => {
  const title = uniqueLabel('Admin Work Thumbnail')
  await createWork(page, title)

  await page.goto('/admin/works')
  await page.getByLabel('Search work titles').fill(title)

  await expect(page.getByRole('columnheader', { name: 'Thumbnail' })).toBeVisible()

  const row = page.getByTestId('admin-work-row').filter({ has: page.getByRole('link', { name: title }) }).first()
  await expect(row).toBeVisible()

  const thumbnailCell = await getCellByHeader(row, page, 'Thumbnail')
  await expect(thumbnailCell).toContainText('No image')
})

test('admin blog list uses compact pagination controls', async ({ page }) => {
  await page.goto('/admin/blog')
  await expectCompactPagination(page)
})

test('admin works list uses compact pagination controls', async ({ page }) => {
  await page.goto('/admin/works')
  await expectCompactPagination(page)
})
