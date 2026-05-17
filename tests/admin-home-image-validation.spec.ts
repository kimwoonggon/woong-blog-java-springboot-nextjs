import path from 'path'
import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('home page image upload shows explicit error when backend upload fails', async ({ page }) => {
  let alertMessage = ''
  page.on('dialog', async (dialog) => {
    alertMessage = dialog.message()
    await dialog.accept().catch(() => {})
  })

  await page.route('**/api/uploads', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'image upload failed' }),
    })
  })

  await page.goto('/admin/pages')
  await expect(page).toHaveURL(/\/admin\/pages/)

  const homeSection = page.locator('#home-page-editor')
  await expect(homeSection.getByText('Home Page - Hero Section')).toBeVisible()
  const imageInput = homeSection.locator('input[type="file"]')
  await imageInput.setInputFiles(path.resolve('tests/fixtures/avatar.png'))

  await expect.poll(() => alertMessage).toContain('Failed to upload image')
  await expect(homeSection.getByText('Home Page - Hero Section')).toBeVisible()
})
