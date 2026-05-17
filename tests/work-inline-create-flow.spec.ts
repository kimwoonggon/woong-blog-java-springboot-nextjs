import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

const SAMPLE_MP4 = readFileSync(path.resolve('tests/fixtures/sample-video.mp4'))

test('public works inline create saves in place and closes after a text-only create', async ({ page }) => {
  const title = `Inline Public Work ${Date.now()}`

  await page.goto('/works')
  await page.getByRole('button', { name: '새 작업 쓰기' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('inline')
  await page.locator('.tiptap.ProseMirror').first().fill('Public inline create body')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])

  await expect(page).toHaveURL(/\/works(?:\?|$)/)
  await expect(page.getByLabel('Title')).toHaveCount(0)
  await expect(page.getByText(title)).toBeVisible()

  await page.getByRole('button', { name: '새 작업 쓰기' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('')
})

test('public works inline create with staged videos stays on /works and refreshes the list', async ({ page }) => {
  const title = `Inline Public Work Video ${Date.now()}`

  await page.goto('/works')
  await page.getByRole('button', { name: '새 작업 쓰기' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await page.locator('.tiptap.ProseMirror').first().fill('Public inline create video body')
  await page.locator('#work-video-upload').setInputFiles({
    name: 'inline-public-video.mp4',
    mimeType: 'video/mp4',
    buffer: SAMPLE_MP4,
  })

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create with Videos' }).click(),
  ])

  await expect(page).toHaveURL(/\/works(?:\?|$)/)
  await expect(page.getByLabel('Title')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '새 작업 쓰기' })).toBeVisible()

  await page.getByRole('button', { name: '새 작업 쓰기' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('')
})

test('existing work video uploads persist thumbnails immediately without requiring Update Work', async ({ page }) => {
  const title = `Immediate Thumbnail Persist ${Date.now()}`

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await page.locator('.tiptap.ProseMirror').first().fill('Thumbnail persistence body')

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])

  const created = await createResponse.json()
  await page.goto(`/admin/works/${created.id}`)
  await expect(page.getByText(/Videos save immediately\./i)).toBeVisible()

  await Promise.all([
    page.waitForResponse((res) =>
      res.url().includes(`/api/admin/works/${created.id}/videos/hls-job`) &&
      res.request().method() === 'POST' &&
      res.ok(),
    ),
    page.waitForResponse((res) =>
      res.url().includes(`/api/admin/works/${created.id}`) &&
      res.request().method() === 'PUT' &&
      res.ok(),
    ),
    page.locator('#work-video-upload').setInputFiles({
      name: 'persist-thumb.mp4',
      mimeType: 'video/mp4',
      buffer: SAMPLE_MP4,
    }),
  ])

  await expect(page.getByAltText('Work thumbnail preview')).toBeVisible({ timeout: 15000 })
  await expect(page.getByAltText('Work thumbnail preview')).toHaveAttribute('src', /\/media\/work-thumbnails\//)

  await page.goto('/works')
  await expect(page.locator(`img[alt="${title}"]`).first()).toHaveAttribute('src', /\/media\/work-thumbnails\//)
})
