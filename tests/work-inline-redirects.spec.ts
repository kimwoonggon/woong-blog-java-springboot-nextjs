import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from './helpers/performance-test'
import { expectedPublicWorksPageSize } from './helpers/responsive-policy'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })
const SAMPLE_MP4 = readFileSync(path.resolve('tests/fixtures/sample-video.mp4'))

test('public works inline create returns to the first works page after save', async ({ page }) => {
  const title = `Public Redirect Work ${Date.now()}`
  const expectedPageSize = await expectedPublicWorksPageSize(page)

  await page.goto(`/works?page=2&pageSize=${expectedPageSize}`)
  await page.getByRole('button', { name: '새 작업 쓰기' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('redirect')
  await page.locator('.tiptap.ProseMirror').first().fill('Redirect create body')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])

  await expect(page).toHaveURL(/\/works(?:\?|$)/)
  await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('1')
  await expect.poll(() => new URL(page.url()).searchParams.get('pageSize')).toBe(String(expectedPageSize))
  await expect(page.getByRole('button', { name: '뒤로가기' })).toHaveCount(0)
  await expect(page.getByLabel('Title')).toHaveCount(0)
})

test('public work detail inline edit returns the user to the originating works page after save', async ({ page }) => {
  const updatedTitle = `Redirected Work Title ${Date.now()}`
  const expectedPageSize = await expectedPublicWorksPageSize(page)

  await page.goto(`/works?page=2&pageSize=${expectedPageSize}`)
  const originalListUrl = page.url()
  await page.locator('a[href^="/works/"]').first().click()

  await page.getByRole('button', { name: '작업 수정' }).click()
  await page.locator('input#title').fill(updatedTitle)

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works/') && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: 'Update Work' }).click(),
  ])

  await expect(page).toHaveURL(originalListUrl)
  await expect(page).not.toHaveURL(/\/admin\/works\//)
  await expect(page.locator('input#title')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '새 작업 쓰기' })).toBeVisible()
})

test('public work detail video-only edits enable Update Work without requiring body changes', async ({ page }) => {
  const title = `Video-only Refresh ${Date.now()}`

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('video')
  await page.locator('.tiptap.ProseMirror').first().fill('video only refresh body')

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])

  const created = await createResponse.json()
  await page.goto(`/works/${created.slug}`)
  await page.getByRole('button', { name: '작업 수정' }).click()
  await expect(page.getByText(/Videos save immediately\./i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Update Work' })).toBeDisabled()

  await page.locator('#work-video-upload').setInputFiles({
    name: 'video-only-refresh.mp4',
    mimeType: 'video/mp4',
    buffer: SAMPLE_MP4,
  })

  await expect(page.getByText('video-only-refresh.mp4')).toBeVisible({ timeout: 20000 })
  await expect(page.getByAltText('Work thumbnail preview')).toHaveAttribute('src', /\/media\/work-thumbnails\//)
  await expect(page.getByRole('button', { name: 'Update Work' })).toBeEnabled()
})
