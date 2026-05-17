import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

for (const scenario of [
  { path: '/introduction', button: '소개글 수정', label: 'Inline introduction save' },
  { path: '/contact', button: '문의글 수정', label: 'Inline contact save' },
]) {
  test(`${scenario.path} inline page save closes the editor and refreshes content`, async ({ page }) => {
    const text = `${scenario.label} ${Date.now()}`

    await page.goto(scenario.path)
    await page.getByRole('button', { name: scenario.button }).click()
    await page.getByLabel('Content (HTML/Text)').fill(`<p>${text}</p>`)

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/pages') && res.request().method() === 'PUT' && res.ok()),
      page.getByRole('button', { name: 'Save Changes' }).click(),
    ])

    await expect(page.getByLabel('Content (HTML/Text)')).toHaveCount(0)
    await expect(page.locator('main')).toContainText(text)
  })
}
