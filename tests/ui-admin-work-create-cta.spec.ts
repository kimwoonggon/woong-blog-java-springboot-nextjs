import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('work create form shows a single default create CTA before videos are staged', async ({ page }) => {
  await page.goto('/admin/works/new')

  await expect(page.getByRole('button', { name: 'Create Work' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create And Add Videos' })).toHaveCount(0)
})

test('work create CTA switches to the staged-video create label', async ({ page }) => {
  await page.goto('/admin/works/new')

  await page.getByLabel('Title').fill(`CTA Singular ${Date.now()}`)
  await page.getByLabel('YouTube URL or ID').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()

  await expect(page.getByRole('button', { name: 'Create with Videos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create Work' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Create And Add Videos' })).toHaveCount(0)
})

test('work create CTA stays consolidated when multiple videos are staged', async ({ page }) => {
  await page.goto('/admin/works/new')

  await page.getByLabel('Title').fill(`CTA Plural ${Date.now()}`)
  await page.getByLabel('YouTube URL or ID').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()
  await page.getByLabel('YouTube URL or ID').fill('https://youtu.be/oHg5SJYRHA0')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()

  await expect(page.getByRole('button', { name: 'Create with Videos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create with Videos' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Create And Add Videos' })).toHaveCount(0)
})
