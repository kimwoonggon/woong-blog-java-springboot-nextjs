import { expect, test } from './helpers/performance-test'

test('capability hint can be dismissed and stays hidden after reload', async ({ page }) => {
  await page.goto('/admin/blog/notion')

  const hint = page.getByTestId('tiptap-capability-hint').first()
  await expect(hint).toBeVisible()
  await page.getByRole('button', { name: /close hint/i }).click()
  await expect(hint).toBeHidden()

  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.getByTestId('tiptap-capability-hint').first()).toBeHidden()
})

test('clearing localStorage restores the capability hint', async ({ page }) => {
  await page.goto('/admin/blog/notion')

  await page.getByRole('button', { name: /close hint/i }).click()
  await expect(page.getByTestId('tiptap-capability-hint').first()).toBeHidden()

  await page.evaluate(() => {
    window.localStorage.removeItem('notionCapabilityHintDismissed')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.getByTestId('tiptap-capability-hint').first()).toBeVisible()
})
