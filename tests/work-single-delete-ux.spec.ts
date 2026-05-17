import { expect, test } from './helpers/performance-test'
import { createWorkFixture } from './helpers/content-fixtures'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('single work delete uses the in-app dialog and removes the row', async ({ page }) => {
  const title = `Single Delete UX ${Date.now()}`

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('qa')
  await page.locator('.tiptap.ProseMirror').first().fill('delete me')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])

  await page.goto('/admin/works')
  const row = page.getByTestId('admin-work-row').filter({ hasText: title }).first()
  await expect(row).toBeVisible()

  await row.getByTitle('Delete').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/admin/works/') && response.request().method() === 'DELETE' && response.ok(),
    ),
    dialog.getByRole('button', { name: 'Delete' }).click(),
  ])

  await expect(dialog).toBeHidden()
  await expect(row).toHaveCount(0, { timeout: 20000 })
})

test('single work delete failure keeps the row visible and allows retry', async ({ page, request }, testInfo) => {
  const fixture = await createWorkFixture(request, testInfo, {
    titlePrefix: 'Single Delete Failure UX',
    published: false,
  })

  await page.goto('/admin/works')
  await page.getByLabel('Search work titles').fill(fixture.title)
  const row = page.getByTestId('admin-work-row').filter({ hasText: fixture.title }).first()
  await expect(row).toBeVisible()

  let forcedFailureUsed = false
  await page.route('**/api/admin/works/**', async (route) => {
    if (route.request().method() === 'DELETE' && !forcedFailureUsed) {
      forcedFailureUsed = true
      await route.fulfill({
        status: 500,
        contentType: 'text/plain',
        body: 'Delete blocked by test',
      })
      return
    }

    await route.fallback()
  })

  await row.getByTitle('Delete').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/admin/works/') && response.request().method() === 'DELETE' && response.status() === 500,
    ),
    dialog.getByRole('button', { name: 'Delete' }).click(),
  ])

  await expect(page.getByText('Delete blocked by test')).toBeVisible()
  await expect(row).toBeVisible()
  await expect(dialog).toBeVisible()
  await expect(page.getByText('Work deleted successfully')).toHaveCount(0)

  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/admin/works/') && response.request().method() === 'DELETE' && response.ok(),
    ),
    dialog.getByRole('button', { name: 'Delete' }).click(),
  ])

  await expect(dialog).toBeHidden()
  await expect(row).toHaveCount(0, { timeout: 20000 })
})
