import path from 'path'
import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })


test('blog editor uploads an inline image and public blog renders it', async ({ page }) => {
  const title = `블로그 이미지 업로드 ${Date.now()}`

  await page.goto('/admin/blog/new')
  await expect(page).toHaveURL(/\/admin\/blog\/new/)

  await page.getByLabel('Title').fill(title)
  await expect(page.getByText("New posts go live immediately. Toggle 'Published' off to save as draft.")).toBeVisible()

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByTitle('Insert Image').click(),
  ])
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/uploads') && res.request().method() === 'POST' && res.ok()),
    fileChooser.setFiles(path.resolve('tests/fixtures/avatar.png')),
  ])

  await page.locator('.tiptap.ProseMirror').first().click()
  await page.keyboard.type(' 이미지가 포함된 게시물입니다.')

  const [saveResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Post' }).click(),
  ])

  const payload = await saveResponse.json()
  await page.goto(`/blog/${payload.slug}`)
  const renderedImage = page.locator('img').first()
  await expect(renderedImage).toBeVisible()
  await expect(renderedImage).toHaveAttribute('src', /\/media\//)
})
