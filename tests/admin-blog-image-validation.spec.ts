import path from 'path'
import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })


test('blog editor keeps editing state when inline image upload fails', async ({ page }) => {
  await page.route('**/api/uploads', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'inline image upload failed' }),
    })
  })

  await page.goto('/admin/blog/new')
  await expect(page).toHaveURL(/\/admin\/blog\/new/)

  await page.getByLabel('Title').fill(`이미지 실패 블로그 ${Date.now()}`)

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByTitle('Insert Image').click(),
  ])
  await fileChooser.setFiles(path.resolve('tests/fixtures/avatar.png'))

  await page.waitForResponse((res) => res.url().includes('/api/uploads') && res.request().method() === 'POST' && res.status() === 500)
  await expect(page.locator('.tiptap.ProseMirror img')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Create Post' })).toBeVisible()
})
