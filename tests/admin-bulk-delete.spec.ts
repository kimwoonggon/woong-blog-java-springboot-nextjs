import { expect, test } from './helpers/performance-test'
import { measureStep } from './helpers/latency'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('admin can bulk delete selected blogs and works with confirmation', async ({ page }, testInfo) => {
  await page.goto('/admin/blog')
  const blogRows = page.getByTestId('admin-blog-row')
  if (await blogRows.count()) {
    await blogRows.first().getByRole('checkbox').click()
    await expect(page.getByRole('button', { name: 'Delete Selected' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete Selected' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await measureStep(
      testInfo,
      'Admin blog bulk delete confirmation to backend response',
      'adminCrud',
      async () => {
        await Promise.all([
          page.waitForResponse((response) =>
            response.url().includes('/api/admin/blogs/') && response.request().method() === 'DELETE' && response.ok(),
          ),
          page.waitForResponse((response) =>
            response.url().includes('/revalidate-public') && response.request().method() === 'POST' && response.ok(),
          ),
          dialog.getByRole('button', { name: 'Delete' }).click(),
        ])
      },
      async () => {
        await expect(dialog).toHaveCount(0)
      },
    )
  }

  await page.goto('/admin/works')
  const workRows = page.getByTestId('admin-work-row')
  if (await workRows.count()) {
    await workRows.first().getByRole('checkbox').click()
    await expect(page.getByRole('button', { name: 'Delete Selected' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete Selected' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await measureStep(
      testInfo,
      'Admin work bulk delete confirmation to backend response',
      'adminCrud',
      async () => {
        await Promise.all([
          page.waitForResponse((response) =>
            response.url().includes('/api/admin/works/') && response.request().method() === 'DELETE' && response.ok(),
          ),
          page.waitForResponse((response) =>
            response.url().includes('/revalidate-public') && response.request().method() === 'POST' && response.ok(),
          ),
          dialog.getByRole('button', { name: 'Delete' }).click(),
        ])
      },
      async () => {
        await expect(dialog).toHaveCount(0)
      },
    )
  }
})
