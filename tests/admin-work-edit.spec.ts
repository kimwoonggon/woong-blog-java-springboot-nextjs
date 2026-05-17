import { expect, test } from './helpers/performance-test'
import { measureStep } from './helpers/latency'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })


test('admin can edit an existing work entry with mixed special input', async ({ page }, testInfo) => {
  const updatedTitle = `수정된 작업! ${Date.now()} ###`
  const updatedBody = `작업 본문 한국어 + English + !!! ${Date.now()}`

  await page.goto('/admin/works')
  const editHref = await page
    .getByTestId('admin-work-row')
    .first()
    .locator('td')
    .nth(2)
    .getByRole('link')
    .getAttribute('href')
  expect(editHref).toMatch(/\/admin\/works\//)
  await page.goto(editHref!)
  await expect(page).toHaveURL(/\/admin\/works\//)
  await expect(page.getByLabel('Title')).toBeVisible()

  await page.getByLabel('Title').fill(updatedTitle)
  await page.locator('.tiptap.ProseMirror').first().fill(updatedBody)

  await measureStep(
    testInfo,
    'Admin work update to public detail refresh',
    'adminMutationPublicRefresh',
    async () => {
      const [response] = await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/admin/works/') && res.request().method() === 'PUT' && res.ok()),
        page.waitForResponse((res) => res.url().includes('/revalidate-public') && res.request().method() === 'POST' && res.ok()),
        page.getByRole('button', { name: 'Update Work' }).click(),
      ])

      return await response.json() as { slug: string }
    },
    async (payload) => {
      await expect(page).toHaveURL(/\/admin\/works(?:\?.*)?$/)
      await expect(page.getByText(updatedTitle)).toBeVisible()
      await page.goto(`/works/${payload.slug}`)
      await expect(page.locator('main h1', { hasText: updatedTitle })).toBeVisible()
      await expect(page.getByText(updatedBody).first()).toBeVisible()
    },
  )
})
