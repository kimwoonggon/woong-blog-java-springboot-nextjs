import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('blog editor requires a title before it enables create', async ({ page }) => {
  await page.goto('/admin/blog/new')
  await expect(page).toHaveURL(/\/admin\/blog\/new/)

  const titleInput = page.getByLabel('Title')
  const saveButton = page.getByRole('button', { name: 'Create Post' })

  await titleInput.fill('   ')
  await page.locator('form .tiptap.ProseMirror').first().click()
  await page.keyboard.type('Body without a valid title')

  await expect(titleInput).toHaveAttribute('required', '')
  await expect(saveButton).toBeDisabled()
})

test('blog editor clamps excerpt length to preview-safe limits', async ({ page }) => {
  await page.goto('/admin/blog/new')
  await expect(page).toHaveURL(/\/admin\/blog\/new/)

  const longExcerpt = 'x'.repeat(260)
  const excerpt = page.getByLabel('Excerpt')

  await excerpt.fill(longExcerpt)

  await expect(excerpt).toHaveValue('x'.repeat(200))
  await expect(page.getByText('200/200')).toBeVisible()
})

test('blog editor accepts mixed special-character and Korean input', async ({ page }) => {
  const title = `특수! English 한글 QA ${Date.now()} !!!`

  await page.goto('/admin/blog/new')
  await expect(page).toHaveURL(/\/admin\/blog\/new/)

  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Tags (comma separated)').fill('qa, 한글, !!!, edge-case')
  await page.locator('.tiptap.ProseMirror').first().click()
  await page.keyboard.type('본문 with English, 한국어, and !!! punctuation for extreme input coverage.')

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Post' }).click(),
  ])

  expect(response.status()).toBe(200)
  await page.goto('/blog')
  await expect(page.getByRole('link', { name: title })).toBeVisible()
})

test('blog editor shows backend validation feedback without leaving the editor', async ({ page }) => {
  await page.route('**/api/admin/blogs', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 400,
      contentType: 'text/plain',
      body: 'Validation failed from forced playwright route',
    })
  })

  await page.goto('/admin/blog/new')
  await expect(page).toHaveURL(/\/admin\/blog\/new/)

  await page.getByLabel('Title').fill(`Validation Failure ${Date.now()}`)
  await page.getByLabel('Tags (comma separated)').fill('qa, validation')
  await page.locator('form .tiptap.ProseMirror').first().click()
  await page.keyboard.type('Body that should keep the editor open on failure')

  await page.getByRole('button', { name: 'Create Post' }).click()

  await expect(page.getByTestId('admin-blog-form-error')).toContainText('Validation failed from forced playwright route')
  await expect(page).toHaveURL(/\/admin\/blog\/new/)
})
