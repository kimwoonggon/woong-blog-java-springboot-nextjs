import { expect, test } from './helpers/performance-test'
import { expectedPublicBlogPageSize } from './helpers/responsive-policy'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('public study inline create returns to the first blog page after save', async ({ page }) => {
  const title = `Public Redirect Study ${Date.now()}`
  const expectedPageSize = await expectedPublicBlogPageSize(page)

  await page.goto(`/blog?page=2&pageSize=${expectedPageSize}`)
  await page.getByRole('button', { name: '새 글 쓰기' }).click()
  await page.getByLabel('Title').fill(title)
  await page.locator('.tiptap.ProseMirror').first().fill('Redirect study create body')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Post' }).click(),
  ])

  await expect(page).toHaveURL(/\/blog(?:\?|$)/)
  await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('1')
  await expect.poll(() => new URL(page.url()).searchParams.get('pageSize')).toBe(String(expectedPageSize))
  await expect(page.getByRole('button', { name: '뒤로가기' })).toHaveCount(0)
  await expect(page.getByLabel('Title')).toHaveCount(0)
})

test('public study detail inline edit returns to the originating blog page', async ({ page }) => {
  const updatedTitle = `Redirected Study Title ${Date.now()}`
  const expectedPageSize = await expectedPublicBlogPageSize(page)

  await page.goto(`/blog?page=2&pageSize=${expectedPageSize}`)
  const originalListUrl = page.url()
  await page.locator('a[href^="/blog/"]').first().click()

  await page.getByRole('button', { name: '글 수정' }).click()
  await page.locator('input#title').fill(updatedTitle)

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs/') && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: 'Update Post' }).click(),
  ])

  await expect(page).toHaveURL(originalListUrl)
  await expect(page.getByLabel('Title')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '새 글 쓰기' })).toBeVisible()
})

test('public blog list clamps an invalid page to the nearest valid page', async ({ page }) => {
  const expectedPageSize = await expectedPublicBlogPageSize(page)
  await page.goto(`/blog?page=9999&pageSize=${expectedPageSize}`)

  await expect(page).toHaveURL(/\/blog\?/)
  await expect.poll(() => Number(new URL(page.url()).searchParams.get('page'))).toBeGreaterThanOrEqual(1)
  await expect(page.getByText('No blog posts found.')).toHaveCount(0)
})
