import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })
test.setTimeout(90_000)

function isPublicRevalidationResponse(response: { url(): string; request(): { method(): string }; ok(): boolean }) {
  return response.url().includes('/revalidate-public')
    && response.request().method() === 'POST'
    && response.ok()
}

async function createBlogForInlineFlow(page: import('./helpers/performance-test').Page, title: string, body: string) {
  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(title)
  await page.locator('.tiptap.ProseMirror').first().fill(body)

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok(), { timeout: 60_000 }),
    page.waitForResponse(isPublicRevalidationResponse, { timeout: 60_000 }),
    page.waitForURL(/\/admin\/blog(?:\?.*)?$/, { timeout: 60_000 }),
    page.getByRole('button', { name: /Create Post/i }).click(),
  ])

  return await response.json() as { id: string; slug: string }
}

test('public blog inline editor clears beforeunload after save', async ({ page }) => {
  const created = await createBlogForInlineFlow(
    page,
    `Inline beforeunload blog ${Date.now()}`,
    'Stable inline beforeunload blog body',
  )
  const updatedTitle = `Public inline blog save ${Date.now()}`
  let dialogSeen = false

  page.on('dialog', async (dialog) => {
    dialogSeen = true
    await dialog.dismiss()
  })

  await page.goto(`/blog/${created.slug}?returnTo=%2Fblog%3Fpage%3D1%26pageSize%3D2&relatedPage=1`)
  const detailUrlPattern = /\/blog\/[^/?#]+(?:\?.*)?$/
  await page.getByRole('button', { name: '글 수정' }).click()

  await page.getByLabel('Title').fill(updatedTitle)
  await expect.poll(async () => page.evaluate(() => typeof window.onbeforeunload)).toBe('function')
  const saveButton = page.getByRole('button', { name: /Update Post/i })
  await expect(saveButton).toBeEnabled()

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs/') && res.request().method() === 'PUT' && res.ok(), { timeout: 60_000 }),
    page.waitForResponse(isPublicRevalidationResponse, { timeout: 60_000 }),
    saveButton.click(),
  ])

  await expect(page).toHaveURL(detailUrlPattern)
  await expect(page.getByText(updatedTitle).first()).toBeVisible()
  await expect.poll(async () => page.evaluate(() => typeof window.onbeforeunload)).toBe('object')
  expect(dialogSeen).toBe(false)
})

test('public work inline editor clears beforeunload after save', async ({ page }) => {
  const updatedTitle = `Public inline work save ${Date.now()}`
  let dialogSeen = false

  page.on('dialog', async (dialog) => {
    dialogSeen = true
    await dialog.dismiss()
  })

  await page.goto('/works?page=1&pageSize=1')
  await page.getByTestId('work-card').first().click()
  await expect(page).toHaveURL(/\/works\/[^/?#]+\?returnTo=/)
  await page.getByRole('button', { name: '작업 수정' }).click()

  await page.getByLabel('Title').fill(updatedTitle)
  await expect.poll(async () => page.evaluate(() => typeof window.onbeforeunload)).toBe('function')
  const saveButton = page.getByRole('button', { name: /Update Work/i })
  await expect(saveButton).toBeEnabled()

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works/') && res.request().method() === 'PUT' && res.ok(), { timeout: 60_000 }),
    page.waitForResponse(isPublicRevalidationResponse, { timeout: 60_000 }),
    saveButton.click(),
  ])

  await expect(page).toHaveURL(/\/works(?:\?.*)?$/)
  await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('1')
  await expect(page.getByText(updatedTitle).first()).toBeVisible()
  await expect.poll(async () => page.evaluate(() => typeof window.onbeforeunload)).toBe('object')
  expect(dialogSeen).toBe(false)
})
