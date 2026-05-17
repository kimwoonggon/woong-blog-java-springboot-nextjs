import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })


test('work editor accepts Korean and punctuation-heavy input and publishes publicly', async ({ page }) => {
  const title = `프로젝트! Work ${Date.now()} ###`
  const content = `본문 한국어 + English + !!! + [] {} () ${Date.now()}`

  await page.goto('/admin/works/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').fill('qa-한글')
  await page.getByLabel('Tags (comma separated)').fill('qa,한글,!!!')
  await page.locator('.tiptap.ProseMirror').first().fill(content)
  await expect(page.getByText('New works go live immediately. Staged videos attach automatically after creation.')).toBeVisible()

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Work' }).click(),
  ])

  const body = await response.json()
  await page.goto(`/works/${body.slug}`)
  await expect(page.locator('main h1', { hasText: title })).toBeVisible()
  await expect(page.getByText(content).first()).toBeVisible()
})
