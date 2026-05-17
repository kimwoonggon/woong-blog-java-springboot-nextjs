import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('WQ-009 blog editor exposes save errors through an inline live region', async ({ page }) => {
  await page.route('**/api/admin/blogs', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 400,
      contentType: 'text/plain',
      body: 'Accessible blog form error',
    })
  })

  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(`A11y Blog ${Date.now()}`)
  await page.locator('.tiptap.ProseMirror').first().click()
  await page.keyboard.type('Trigger accessible blog form error.')
  await page.getByRole('button', { name: 'Create Post' }).click()

  const alert = page.getByTestId('admin-blog-form-error')
  await expect(alert).toHaveAttribute('role', 'alert')
  await expect(alert).toHaveAttribute('aria-live', 'polite')
  await expect(alert).toContainText('Accessible blog form error')
})

test('WQ-009 work editor exposes save errors through an inline live region', async ({ page }) => {
  await page.route('**/api/admin/works', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 400,
      contentType: 'text/plain',
      body: 'Accessible work form error',
    })
  })

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(`A11y Work ${Date.now()}`)
  await page.getByRole('button', { name: 'Create Work' }).click()

  const alert = page.getByTestId('admin-work-form-error')
  await expect(alert).toHaveAttribute('role', 'alert')
  await expect(alert).toHaveAttribute('aria-live', 'polite')
  await expect(alert).toContainText('Accessible work form error')
})
