import { readFileSync } from 'node:fs'
import path from 'path'
import { expect, test, type Page } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })
const SAMPLE_MP4 = readFileSync(path.resolve('tests/fixtures/sample-video.mp4'))

async function fillWorkBasics(page: Page, title: string, category = 'video') {
  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill(category)
  await page.locator('.tiptap.ProseMirror').first().fill(`Auto thumbnail coverage for ${title}`)
}

test('auto-fills thumbnail from an uploaded video when no manual thumbnail exists', async ({ page }) => {
  const title = `Auto Thumb MP4 ${Date.now()}`

  await fillWorkBasics(page, title)
  await page.locator('#work-video-upload').setInputFiles({
    name: 'auto-thumb.mp4',
    mimeType: 'video/mp4',
    buffer: SAMPLE_MP4,
  })

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create with Videos' }).click(),
  ])

  const created = await createResponse.json()
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })
  await expect(page.getByAltText('Work thumbnail preview')).toBeVisible()
  await expect(page.getByAltText('Work thumbnail preview')).toHaveAttribute('src', /\/media\/work-thumbnails\//)
  await page.screenshot({ path: 'test-results/playwright/admin-work-auto-thumbnail-mp4.png', fullPage: true })

  await page.goto('/works')
  await expect(page.locator(`img[alt="${title}"]`).first()).toHaveAttribute('src', /\/media\/work-thumbnails\//)
})

test('prefers uploaded-video auto thumbnails over youtube thumbnails', async ({ page }) => {
  const title = `Auto Thumb Mixed ${Date.now()}`
  let youtubeThumbnailRequests = 0

  page.on('request', (request) => {
    if (request.url().includes('img.youtube.com/vi/')) {
      youtubeThumbnailRequests += 1
    }
  })

  await fillWorkBasics(page, title)
  await page.getByLabel('YouTube URL or ID').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()
  await page.locator('#work-video-upload').setInputFiles({
    name: 'auto-thumb-mixed.mp4',
    mimeType: 'video/mp4',
    buffer: SAMPLE_MP4,
  })

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create with Videos' }).click(),
  ])

  const created = await createResponse.json()
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })
  await expect(page.getByAltText('Work thumbnail preview')).toBeVisible()
  await expect(page.getByAltText('Work thumbnail preview')).toHaveAttribute('src', /\/media\/work-thumbnails\//)
  expect(youtubeThumbnailRequests).toBe(0)
  await page.screenshot({ path: 'test-results/playwright/admin-work-auto-thumbnail-mixed.png', fullPage: true })
})

test('falls back to the first content image when there are no videos and no explicit thumbnail', async ({ page }) => {
  const title = `Auto Thumb Photo ${Date.now()}`

  await fillWorkBasics(page, title, 'photo')

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByTitle('Insert Image').click(),
  ])

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/uploads') && res.request().method() === 'POST' && res.ok()),
    fileChooser.setFiles(path.resolve('tests/fixtures/avatar.png')),
  ])

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])

  const created = await createResponse.json()
  await page.goto(`/admin/works/${created.id}`)
  await expect(page.getByTestId('work-thumbnail-source')).toHaveText('Thumbnail source: content image')
  await expect(page.getByAltText('Work thumbnail preview')).toBeVisible()
  await page.screenshot({ path: 'test-results/playwright/admin-work-auto-thumbnail-photo.png', fullPage: true })

  await page.goto('/works')
  await expect(page.locator(`img[alt="${title}"]`).first()).toBeVisible()
})

test('auto-fills a thumbnail when the work only has a YouTube video', async ({ page }) => {
  const title = `Auto Thumb YouTube ${Date.now()}`

  await fillWorkBasics(page, title)
  await page.getByLabel('YouTube URL or ID').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create with Videos' }).click(),
  ])

  const created = await createResponse.json()
  await page.waitForURL(new RegExp(`/admin/works/${created.id}\\?videoInline=1$`), { timeout: 20000 })
  await page.getByRole('tab', { name: 'Media & Videos' }).click()
  await expect(page.getByTestId('work-thumbnail-source')).not.toHaveText('Thumbnail source: none')
  await expect(page.getByAltText('Work thumbnail preview')).toBeVisible()
  await expect(page.getByAltText('Work thumbnail preview')).toHaveAttribute('src', /(?:img\.youtube\.com\/vi\/dQw4w9WgXcQ\/hqdefault\.jpg|\/media\/work-thumbnails\/)/)

  await page.goto('/works')
  await expect(page.locator(`img[alt="${title}"]`).first()).toHaveAttribute('src', /(?:img\.youtube\.com\/vi\/dQw4w9WgXcQ\/hqdefault\.jpg|\/media\/work-thumbnails\/)/)
})

test('auto-fills a thumbnail when an existing work without one gets an uploaded video', async ({ page }) => {
  const title = `Auto Thumb Existing ${Date.now()}`

  await fillWorkBasics(page, title)

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/works' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])

  const created = await createResponse.json()
  await page.goto(`/admin/works/${created.id}`)
  await page.getByRole('tab', { name: 'Media & Videos' }).click()
  await expect(page.getByTestId('work-thumbnail-source')).toHaveText('Thumbnail source: none')

  await page.locator('#work-video-upload').setInputFiles({
    name: 'existing-auto-thumb.mp4',
    mimeType: 'video/mp4',
    buffer: SAMPLE_MP4,
  })

  await expect(page.getByTestId('work-thumbnail-source')).toHaveText('Thumbnail source: uploaded video')
  await expect(page.getByAltText('Work thumbnail preview')).toHaveAttribute('src', /\/media\/work-thumbnails\//)
  await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === `/api/admin/works/${created.id}` && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: 'Update Work' }).click(),
  ])
  await page.screenshot({ path: 'test-results/playwright/admin-work-auto-thumbnail-existing.png', fullPage: true })
})
