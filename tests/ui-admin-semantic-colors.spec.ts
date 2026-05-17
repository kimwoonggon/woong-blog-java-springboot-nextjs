import { expect, test } from './helpers/performance-test'
import { createBlogFixture } from './helpers/content-fixtures'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })
test.setTimeout(60_000)

test('VA-005 success, warning, and error states keep distinct semantic color treatments', async ({ page, request }, testInfo) => {
  const draftTitle = `Semantic Draft ${Date.now()}`

  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(draftTitle)
  await page.getByRole('checkbox', { name: 'Published' }).uncheck()
  await page.locator('form .tiptap.ProseMirror').first().click()
  await page.keyboard.type('Draft body for semantic color verification.')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Post' }).click(),
  ])

  await page.goto('/admin/blog')
  const draftRow = page.getByTestId('admin-blog-row').filter({ hasText: draftTitle }).first()
  await expect(draftRow).toBeVisible()
  const draftBadge = draftRow.locator('[data-slot="badge"]').filter({ hasText: 'Draft' }).first()
  await expect(draftBadge).toBeVisible()
  const draftClasses = await draftBadge.getAttribute('class')

  let failAutosave = false
  const notionBlog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'Semantic Notion State',
    html: '<p>Semantic notion state fixture.</p>',
  })
  await page.route('**/api/admin/blogs/**', async (route) => {
    if (route.request().method() !== 'PUT') {
      await route.fallback()
      return
    }
    if (!failAutosave) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 500,
      contentType: 'text/plain',
      body: 'Semantic color failure',
    })
  })

  await page.goto(`/admin/blog/notion?id=${encodeURIComponent(notionBlog.id)}`)
  const editor = page.locator('.tiptap.ProseMirror').first()
  await editor.click()
  await page.keyboard.type(` semantic-saved-${Date.now()}`)

  const saveChip = page.getByTestId('notion-save-state')
  await expect(saveChip).toHaveText('Saved')
  const savedClasses = await saveChip.getAttribute('class')

  failAutosave = true
  await editor.click()
  await page.keyboard.type(' semantic-error')
  await expect(saveChip).toHaveText('Error', { timeout: 15_000 })
  const errorClasses = await saveChip.getAttribute('class')

  await page.goto('/admin/dashboard?__qaSummaryFail=1')
  const errorPanel = page
    .getByRole('heading', { name: 'Dashboard data is unavailable' })
    .locator('xpath=ancestor::div[1]')
  await expect(errorPanel).toBeVisible()
  const errorPanelClasses = await errorPanel.getAttribute('class')

  expect(draftClasses).toContain('bg-yellow-100')
  expect(savedClasses).toContain('border-emerald-200')
  expect(errorClasses).toContain('border-red-200')
  expect(errorPanelClasses).toContain('border-red-200')
})
