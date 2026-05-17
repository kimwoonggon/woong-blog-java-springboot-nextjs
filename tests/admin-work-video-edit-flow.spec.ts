import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('admin can add videos inline while editing an existing work', async ({ page }) => {
  const title = `Video Edit Flow ${Date.now()}`
  const editor = page.locator('.tiptap.ProseMirror').first()

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await editor.fill('Edit mode inline intro.')

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])

  const created = await createResponse.json()
  await page.goto(`/admin/works/${created.id}`)
  await expect(page.getByLabel('Title')).toHaveValue(title)
  await expect(page.getByText(/Saved videos version 0/i)).toBeVisible()

  await page.getByLabel('YouTube URL or ID').fill('https://youtu.be/dQw4w9WgXcQ')
  await expect(page.getByRole('button', { name: 'Add YouTube Video' })).toBeEnabled()
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/videos/youtube') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Add YouTube Video' }).click(),
  ])

  await page.getByRole('button', { name: 'Insert Into Body' }).nth(0).click()
  await editor.click()
  await editor.pressSequentially(' Tail copy after inline video.')

  await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === `/api/admin/works/${created.id}` && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: 'Update Work' }).click(),
  ])

  await page.goto(`/works/${created.slug}`)
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]').first()).toBeVisible()
  await expect(page.getByText(/Edit mode inline intro\./).first()).toBeVisible()
  await expect(page.getByText(/Tail copy after inline video\./).first()).toBeVisible()
})

test('admin can reorder saved videos and delete a removed video while editing an existing work', async ({ page }) => {
  const title = `Video Edit Reorder ${Date.now()}`
  const editor = page.locator('.tiptap.ProseMirror').first()

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await editor.fill('Saved video order coverage.')

  await page.getByLabel('YouTube URL or ID').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()
  await page.getByLabel('YouTube URL or ID').fill('https://youtu.be/9bZkp7q19f0')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create with Videos' }).click(),
  ])

  const created = await createResponse.json() as { id: string; slug: string }
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })
  await expect(page.getByText(/Saved videos version/i)).toBeVisible()

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/videos/order') && res.request().method() === 'PUT' && res.ok()),
    page.getByTitle('Move Down').first().click(),
  ])

  const savedEmbeds = page.locator('iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]')
  await expect(savedEmbeds.first()).toHaveAttribute('src', /9bZkp7q19f0/)

  const originalVideoCard = page
    .locator('div.rounded-xl.border')
    .filter({ hasText: 'YouTube dQw4w9WgXcQ' })
    .filter({ has: page.getByTitle('Remove Video') })
    .first()

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/videos/') && res.request().method() === 'DELETE' && res.ok()),
    originalVideoCard.getByTitle('Remove Video').click(),
  ])

  await expect(savedEmbeds).toHaveCount(1)
  await expect(savedEmbeds.first()).toHaveAttribute('src', /9bZkp7q19f0/)

  await page.goto(`/works/${created.slug}`)
  const embeds = page.locator('iframe[src*="youtube-nocookie.com/embed/"]')
  await expect(embeds).toHaveCount(1)
  await expect(embeds.first()).toHaveAttribute('src', /9bZkp7q19f0/)
})
