import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('introduction and contact inline editors open in place and can be closed with back buttons', async ({ page }) => {
  await page.goto('/introduction')
  await page.getByRole('button', { name: '소개글 수정' }).click()
  await expect(page.getByRole('heading', { name: 'Introduction Inline Editor' }).first()).toBeVisible()
  await expect(page.getByLabel('Title')).toBeVisible()
  await expect(page.getByRole('button', { name: '뒤로가기' })).toBeVisible()
  await page.getByRole('button', { name: '뒤로가기' }).click()
  await expect(page.getByLabel('Title')).toHaveCount(0)

  await page.goto('/contact')
  await page.getByRole('button', { name: '문의글 수정' }).click()
  await expect(page.getByRole('heading', { name: 'Contact Inline Editor' }).first()).toBeVisible()
  await expect(page.getByLabel('Title')).toBeVisible()
  await page.getByRole('button', { name: '뒤로가기' }).click()
  await expect(page.getByLabel('Title')).toHaveCount(0)
})

test('works and study inline create panels open in place and can be closed', async ({ page }) => {
  await page.goto('/works')
  await expect(page.getByRole('button', { name: '새 작업 쓰기' })).toBeVisible()
  await page.getByRole('button', { name: '새 작업 쓰기' }).click()
  await expect(page.getByRole('heading', { name: 'Works Inline Create' })).toBeVisible()
  await expect(page.getByLabel('Title')).toBeVisible()
  await page.getByRole('button', { name: '뒤로가기' }).click()
  await expect(page.getByLabel('Title')).toHaveCount(0)

  await page.goto('/blog')
  await expect(page.getByRole('button', { name: '새 글 쓰기' })).toBeVisible()
  await page.getByRole('button', { name: '새 글 쓰기' }).click()
  await expect(page.getByRole('heading', { name: 'Study Inline Create' })).toBeVisible()
  await expect(page.getByLabel('Title')).toBeVisible()
  await page.getByRole('button', { name: '뒤로가기' }).click()
  await expect(page.getByLabel('Title')).toHaveCount(0)
})

test('resume page exposes inline PDF upload shell for admins', async ({ page }) => {
  await page.goto('/resume')
  await page.getByRole('button', { name: '이력서 PDF 업로드' }).click()
  await expect(page.getByRole('heading', { name: 'Resume Inline Upload' })).toBeVisible()
  await expect(page.getByText(/Upload your latest resume/i)).toBeVisible()
  await page.getByRole('button', { name: '뒤로가기' }).click()
  await expect(page.getByText(/Upload your latest resume/i)).toHaveCount(0)
})
