import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })
test.describe.configure({ mode: 'serial' })

test('WQ-012 admin toasts announce politely without stealing focus', async ({ page }) => {
  await page.route('**/api/admin/blogs', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 400,
      contentType: 'text/plain',
      body: 'Toast accessibility validation failure',
    })
  })

  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(`Toast A11y ${Date.now()}`)
  await page.locator('form .tiptap.ProseMirror').first().click()
  await page.keyboard.type('Trigger a toast while keeping focus stable.')

  const saveButton = page.getByRole('button', { name: 'Create Post' })
  await saveButton.focus()
  await saveButton.click()

  const toasterRegion = page
    .locator('section[aria-live="polite"][aria-label^="Notifications"]')
    .first()
  await expect(toasterRegion).toHaveAttribute('aria-live', 'polite')
  await expect(toasterRegion).toHaveAttribute('aria-relevant', 'additions text')
  await expect(page.getByTestId('admin-blog-form-error')).toContainText('Toast accessibility validation failure')

  await expect
    .poll(() => page.evaluate(() => document.activeElement?.textContent ?? document.activeElement?.getAttribute('aria-label') ?? ''))
    .toContain('Create Post')
})
