import { expect, test, type Page } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

async function expectEnglishTableChrome(page: Page, path: string, searchLabel: string) {
  await page.goto(path)

  await expect(page.getByLabel(searchLabel)).toHaveAttribute('placeholder', /Search by/i)
  await expect(page.getByRole('button', { name: 'Previous page' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible()
  await expect(page.getByText(/^Page \d+ of \d+$/)).toBeVisible()
  await expect(page.getByText('First', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Last', { exact: true })).toHaveCount(0)

  const paginationText = await page.getByText(/^Page \d+ of \d+$/).innerText()

  expect(paginationText).not.toMatch(/[가-힣]/)
}

test('admin blog table chrome uses English labels', async ({ page }) => {
  await expectEnglishTableChrome(page, '/admin/blog', 'Search blog titles')
})

test('admin works table chrome uses English labels', async ({ page }) => {
  await expectEnglishTableChrome(page, '/admin/works', 'Search work titles')
})
