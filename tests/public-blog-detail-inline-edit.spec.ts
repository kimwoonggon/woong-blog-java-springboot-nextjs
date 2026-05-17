import { expect, test } from './helpers/performance-test'
import { expectedPublicBlogPageSize } from './helpers/responsive-policy'
import { createBlogFixture } from './helpers/content-fixtures'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })


test('admin can edit a public blog detail inline and return to the originating blog page', async ({ page }) => {
  const updatedTitle = `Inline Blog Title ${Date.now()}`
  const expectedPageSize = await expectedPublicBlogPageSize(page)

  await page.goto(`/blog?page=2&pageSize=${expectedPageSize}`)
  const originalListUrl = page.url()
  await page.locator('a[href^="/blog/"]').first().click()

  await expect(page.getByRole('button', { name: '글 수정' })).toBeVisible()
  await page.getByRole('button', { name: '글 수정' }).click()

  const saveButton = page.getByRole('button', { name: 'Update Post' })
  await expect(saveButton).toBeDisabled()

  await page.locator('input#title').fill(updatedTitle)
  await expect(saveButton).toBeEnabled()

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs/') && res.request().method() === 'PUT' && res.ok()),
    saveButton.click(),
  ])

  await expect(page).toHaveURL(originalListUrl)
  await expect(page).not.toHaveURL(/\/admin\/blog\//)
  await expect(page.getByLabel('Title')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '새 글 쓰기' })).toBeVisible()
})

test('public blog detail shows paginated related posts', async ({ page, request }, testInfo) => {
  const blog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'Related Blog Detail',
    html: '<h2>Related blog body</h2><p>Related blog fixture body.</p>',
    tags: ['related-detail', 'blog'],
  })

  await page.setViewportSize({ width: 1440, height: 1800 })
  await page.goto(`/blog/${blog.slug}`)

  await expect(page.getByRole('heading', { name: 'More Studies' })).toBeVisible()
  await expect(page.getByTestId('related-blog-card').first()).toBeVisible()
  const relatedSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'More Studies' }) })
  await expect(relatedSection.getByText(/^Page 1 of \d+$/)).toBeVisible()
  await expect(relatedSection.getByRole('button', { name: 'Go to next related page' })).toBeVisible()
  await expect(relatedSection.getByRole('button', { name: '2' })).toBeVisible()
})
