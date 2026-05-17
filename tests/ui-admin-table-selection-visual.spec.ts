import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('VA-213 selected admin table rows gain a visual selected state', async ({ page }) => {
  await page.goto('/admin/blog')

  const row = page.getByTestId('admin-blog-row').first()
  await expect(row).toBeVisible()
  await row.getByRole('checkbox').check()

  await expect.poll(() => row.getAttribute('data-state')).toBe('selected')

  const backgroundColor = await row.evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
})
