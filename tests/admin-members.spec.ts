import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('admin members page lists joined users with privacy-safe fields', async ({ page }) => {
  await page.goto('/admin/members')

  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible()
  await expect(page.getByText(/privacy-safe/i)).toBeVisible()
  await expect(page.getByTestId('member-row').first()).toBeVisible()
  await expect(page.getByText('admin@example.com')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'google' }).first()).toBeVisible()
  await expect(page.getByText('sessionKey')).toHaveCount(0)
  await expect(page.getByText('providerSubject')).toHaveCount(0)
  await expect(page.getByText('ipAddress')).toHaveCount(0)
})

test('admin members page stays read-only without edit or delete actions', async ({ page }) => {
  await page.goto('/admin/members')

  await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /edit|delete|remove|save/i })).toHaveCount(0)
  await expect(page.getByTestId('member-row').first().getByRole('button')).toHaveCount(0)
  await expect(page.getByTestId('member-row').first().getByRole('link')).toHaveCount(0)
})
