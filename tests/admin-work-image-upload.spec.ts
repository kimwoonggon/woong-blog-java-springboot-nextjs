import path from 'path'
import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })


test('work editor uploads thumbnail/icon media and reuses them across admin/public views', async ({ page }) => {
  const title = `워크 이미지 업로드 ${Date.now()}`

  await page.goto('/admin/works/new')
  await expect(page).toHaveURL(/\/admin\/works\/new/)

  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('media')
  await expect(page.getByText('New works go live immediately. Staged videos attach automatically after creation.')).toBeVisible()
  await page.locator('.tiptap.ProseMirror').first().fill('이미지가 포함된 work입니다.')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/uploads') && res.request().method() === 'POST' && res.ok()),
    page.locator('#work-thumbnail-upload').setInputFiles(path.resolve('tests/fixtures/avatar.png')),
  ])

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/uploads') && res.request().method() === 'POST' && res.ok()),
    page.locator('#work-icon-upload').setInputFiles(path.resolve('tests/fixtures/avatar.png')),
  ])

  const [saveResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])

  const payload = await saveResponse.json()

  await page.goto(`/admin/works/${payload.id}`)
  await expect(page.getByAltText('Work thumbnail preview')).toBeVisible()
  await expect(page.getByAltText('Work icon preview')).toBeVisible()
  await expect(page.getByAltText('Work thumbnail preview')).toHaveAttribute('src', /\/media\/work-thumbnails\//)
  await expect(page.getByAltText('Work icon preview')).toHaveAttribute('src', /\/media\/work-icons\//)

  await page.goto('/works')
  const publicCardImage = page.locator(`a[href*="/works/${payload.slug}"] img[alt="${title}"]`).first()
  await expect(publicCardImage).toBeVisible()
  await expect(publicCardImage).toHaveAttribute('src', /work-thumbnails/)
})
