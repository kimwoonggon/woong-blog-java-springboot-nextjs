import { expect, test } from './helpers/performance-test'
import { measureStep } from './helpers/latency'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })


test('admin can create and publish a blog post that appears on public blog page', async ({ page }, testInfo) => {
  const title = `Playwright Post ${Date.now()}`

  await page.goto('/admin/blog/new')

  await expect(page).toHaveURL(/\/admin\/blog\/new/)
  await expect(page.getByText("New posts go live immediately. Toggle 'Published' off to save as draft.")).toBeVisible()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Tags (comma separated)').fill('playwright, regression')

  const editor = page.locator('.tiptap.ProseMirror').first()
  await editor.click()
  await page.keyboard.type(`This is a browser-driven published post for ${title}.`)

  await measureStep(
    testInfo,
    'Admin blog create to public detail refresh',
    'adminMutationPublicRefresh',
    async () => {
      const [saveResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
        page.waitForResponse((res) => res.url().includes('/revalidate-public') && res.request().method() === 'POST' && res.ok()),
        page.getByRole('button', { name: /Create Post/i }).click(),
      ])

      return await saveResponse.json() as { slug: string }
    },
    async (payload) => {
      await page.goto(`/blog/${payload.slug}`)
      await expect(page.locator('main h1', { hasText: title })).toBeVisible()
    },
  )
  await page.screenshot({ path: 'test-results/playwright/admin-blog-publish.png', fullPage: true })
})

test('admin can keep a blog post as draft and publish it later', async ({ page }) => {
  const title = `Playwright Draft Blog ${Date.now()}`

  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Tags (comma separated)').fill('playwright, draft')
  await page.getByRole('checkbox', { name: 'Published' }).uncheck()

  const editor = page.locator('.tiptap.ProseMirror').first()
  await editor.click()
  await page.keyboard.type(`This post starts as a draft for ${title}.`)

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: /Create Post/i }).click(),
  ])

  const created = await createResponse.json() as { id: string; slug: string }
  await expect(page).toHaveURL(/\/admin\/blog(?:\?.*)?$/)

  await page.getByLabel('Search blog titles').fill(title)
  const row = page.getByTestId('admin-blog-row').filter({ hasText: title }).first()
  await expect(row).toBeVisible()
  await expect(row.locator('[data-slot="badge"]').filter({ hasText: /^Draft$/ }).first()).toBeVisible()

  await page.goto(`/blog/${created.slug}`)
  await expect(page.getByRole('heading', { name: title })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '404 - Page Not Found' })).toBeVisible()

  await page.goto(`/admin/blog/${created.id}`)
  const publishedCheckbox = page.getByRole('checkbox', { name: 'Published' })
  await expect(publishedCheckbox).not.toBeChecked()
  await publishedCheckbox.check()

  await Promise.all([
    page.waitForResponse((res) => res.url().includes(`/api/admin/blogs/${created.id}`) && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: /Update Post/i }).click(),
  ])

  await expect(page).toHaveURL(/\/admin\/blog(?:\?.*)?$/)
  await page.getByLabel('Search blog titles').fill(title)
  const publishedRow = page.getByTestId('admin-blog-row').filter({ hasText: title }).first()
  await expect(publishedRow).toBeVisible()
  await expect(publishedRow.locator('[data-slot="badge"]').filter({ hasText: /^Published$/ }).first()).toBeVisible()

  await page.goto(`/blog/${created.slug}`)
  await expect(page.locator('main h1', { hasText: title })).toBeVisible()
})

test('admin can toggle a published blog post back to draft and publish it again', async ({ page }) => {
  const title = `Playwright Toggle Blog ${Date.now()}`

  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Tags (comma separated)').fill('playwright, toggle')

  const editor = page.locator('.tiptap.ProseMirror').first()
  await editor.click()
  await page.keyboard.type(`This post exercises publish toggles for ${title}.`)

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: /Create Post/i }).click(),
  ])

  const created = await createResponse.json() as { id: string; slug: string }

  await page.goto(`/blog/${created.slug}`)
  await expect(page.locator('main h1', { hasText: title })).toBeVisible()

  await page.goto(`/admin/blog/${created.id}`)
  const publishedCheckbox = page.getByRole('checkbox', { name: 'Published' })
  await expect(publishedCheckbox).toBeChecked()
  await publishedCheckbox.uncheck()

  await Promise.all([
    page.waitForResponse((res) => res.url().includes(`/api/admin/blogs/${created.id}`) && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: /Update Post/i }).click(),
  ])

  await expect(page).toHaveURL(/\/admin\/blog(?:\?.*)?$/)
  await page.getByLabel('Search blog titles').fill(title)
  const draftRow = page.getByTestId('admin-blog-row').filter({ hasText: title }).first()
  await expect(draftRow).toBeVisible()
  await expect(draftRow.locator('[data-slot="badge"]').filter({ hasText: /^Draft$/ }).first()).toBeVisible()

  await page.goto(`/blog/${created.slug}`)
  await expect(page.getByRole('heading', { name: title })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '404 - Page Not Found' })).toBeVisible()

  await page.goto(`/admin/blog/${created.id}`)
  await page.getByRole('checkbox', { name: 'Published' }).check()

  await Promise.all([
    page.waitForResponse((res) => res.url().includes(`/api/admin/blogs/${created.id}`) && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: /Update Post/i }).click(),
  ])

  await expect(page).toHaveURL(/\/admin\/blog(?:\?.*)?$/)
  await page.getByLabel('Search blog titles').fill(title)
  const publishedRow = page.getByTestId('admin-blog-row').filter({ hasText: title }).first()
  await expect(publishedRow).toBeVisible()
  await expect(publishedRow.locator('[data-slot="badge"]').filter({ hasText: /^Published$/ }).first()).toBeVisible()

  await page.goto(`/blog/${created.slug}`)
  await expect(page.locator('main h1', { hasText: title })).toBeVisible()
})
