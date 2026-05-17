import { expect, test } from './helpers/performance-test'
import { createBlogFixture } from './helpers/content-fixtures'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })
test.setTimeout(60_000)

test('VA-241 selected notion document stays visually highlighted inside the library sheet', async ({ page, request }, testInfo) => {
  const blog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'Notion Visual Highlight',
    html: '<p>Notion visual highlight fixture.</p>',
  })

  await page.goto(`/admin/blog/notion?id=${encodeURIComponent(blog.id)}`)
  await expect(page.getByRole('heading', { name: 'Blog Notion View' }).first()).toBeVisible()

  await page.getByTestId('notion-library-trigger').click()
  const sheet = page.getByTestId('notion-library-sheet')
  await expect(sheet).toBeVisible()

  const activeTitle = await page.getByLabel('Title').inputValue()
  const activeItem = sheet
    .getByTestId('notion-blog-list-item')
    .filter({ hasText: activeTitle })
    .first()
    .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
  await expect(activeItem).toBeVisible()

  const classes = await activeItem.getAttribute('class')
  expect(classes).toContain('border-primary/40')
  expect(classes).toContain('bg-primary/5')
})

test('VA-242 notion save-state chip changes visual treatment across saved and error states', async ({ page, request }, testInfo) => {
  let failAutosave = false
  const blog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'Notion Visual State',
    html: '<p>Notion visual state fixture.</p>',
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
      body: 'Forced notion autosave failure',
    })
  })

  await page.goto(`/admin/blog/notion?id=${encodeURIComponent(blog.id)}`)
  await expect(page.getByRole('heading', { name: 'Blog Notion View' }).first()).toBeVisible()

  const editor = page.locator('.tiptap.ProseMirror').first()
  await editor.click()
  await page.keyboard.type(` saved-state-${Date.now()}`)

  const saveChip = page.getByTestId('notion-save-state')
  await expect(saveChip).toHaveText('Saved')
  const savedClasses = await saveChip.getAttribute('class')

  failAutosave = true
  await editor.click()
  await page.keyboard.type(' error-state')

  await expect(saveChip).toHaveText('Error', { timeout: 15_000 })
  const errorClasses = await saveChip.getAttribute('class')

  expect(savedClasses).toContain('border-emerald-200')
  expect(errorClasses).toContain('border-red-200')
  expect(savedClasses).not.toBe(errorClasses)
})
