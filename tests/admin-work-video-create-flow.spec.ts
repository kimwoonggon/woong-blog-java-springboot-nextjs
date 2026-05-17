import path from 'path'
import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('admin can create a work with staged YouTube and uploaded videos', async ({ page }) => {
  const title = `Video Create Flow ${Date.now()}`

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await page.locator('.tiptap.ProseMirror').first().fill('Work with videos')

  await page.getByLabel('YouTube URL or ID').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()
  await expect(page.getByText('https://youtu.be/dQw4w9WgXcQ')).toBeVisible()

  await page.locator('#work-video-upload').setInputFiles(path.resolve('tests/fixtures/sample-video.mp4'))
  await expect(page.getByText('sample-video.mp4')).toBeVisible()

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create with Videos' }).click(),
  ])

  const created = await createResponse.json()
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })
  await expect(page.getByText('Videos were saved. Continue by placing them inline inside the body wherever they should appear.')).toBeVisible()

  await page.goto(`/works/${created.slug}`)
  await expect(page.locator('main h1', { hasText: title })).toBeVisible()
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toBeVisible()
  await expect(page.locator('video')).toHaveCount(1, { timeout: 20000 })
})
