import { expect, test } from './helpers/performance-test'
import { createBlogFixture } from './helpers/content-fixtures'
import { measureStep } from './helpers/latency'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })
test.setTimeout(60_000)


test('admin can edit an existing blog post with mixed special input', async ({ page, request }, testInfo) => {
  const updatedTitle = `수정된 블로그! ${Date.now()} ###`
  const updatedBody = `수정 본문 한국어 + English + !!! ${Date.now()}`
  const blog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'Admin Edit Blog',
    html: '<p>Admin edit fixture body.</p>',
  })

  await page.goto(`/admin/blog/${encodeURIComponent(blog.id)}`)
  await expect(page.getByLabel('Title')).toBeVisible()

  await page.getByLabel('Title').fill(updatedTitle)
  const publishedCheckbox = page.getByRole('checkbox', { name: 'Published' })
  if (!(await publishedCheckbox.isChecked())) {
    await publishedCheckbox.click()
  }

  await page.locator('.tiptap.ProseMirror').first().click()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await page.keyboard.type(updatedBody)

  await measureStep(
    testInfo,
    'Admin blog update to public detail refresh',
    'adminMutationPublicRefresh',
    async () => {
      const [response] = await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/admin/blogs/') && res.request().method() === 'PUT' && res.ok()),
        page.waitForResponse((res) => res.url().includes('/revalidate-public') && res.request().method() === 'POST' && res.ok()),
        page.getByRole('button', { name: 'Update Post' }).click(),
      ])

      return await response.json() as { slug: string }
    },
    async (payload) => {
      await page.goto(`/blog/${payload.slug}`)
      await expect(page.locator('main h1', { hasText: updatedTitle })).toBeVisible()
      await expect(page.getByText(updatedBody).first()).toBeVisible()
    },
  )
})

test('blog notion view supports list selection and content autosave', async ({ page, request }, testInfo) => {
  const autosaveText = `Autosaved from notion view ${Date.now()}`
  const firstBlog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'Notion Selection First',
    html: '<p>First notion selection fixture body.</p>',
  })
  const secondBlog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'Notion Selection Second',
    html: '<p>Second notion selection fixture body.</p>',
  })

  await page.goto(`/admin/blog/notion?id=${encodeURIComponent(firstBlog.id)}`)
  await expect(page.getByRole('heading', { name: 'Blog Notion View' }).first()).toBeVisible()
  await page.getByTestId('notion-library-trigger').click()
  await expect(page.getByTestId('notion-blog-list-item').filter({ hasText: firstBlog.title }).first()).toBeVisible()
  await expect(page.getByTestId('notion-blog-list-item').filter({ hasText: secondBlog.title }).first()).toBeVisible()
  await expect(page.getByTestId('tiptap-toolbar-hint')).toContainText('Type / for commands')

  await page.getByTestId('notion-blog-list-item').filter({ hasText: secondBlog.title }).first().click()

  await expect(page).toHaveURL(/\/admin\/blog\/notion\?id=/)
  await expect.poll(() => new URL(page.url()).searchParams.get('id')).toBe(secondBlog.id)

  const editor = page.locator('.tiptap.ProseMirror').first()
  const saveResponse = page.waitForResponse((response) =>
    response.url().includes('/api/admin/blogs/') && response.request().method() === 'PUT' && response.ok(),
  )
  await editor.click()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await page.keyboard.type(autosaveText)

  await saveResponse
  await expect(page.getByTestId('notion-save-state')).toHaveText('Saved')
  await expect(page.getByLabel('Title')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Published' })).toBeVisible()
})
