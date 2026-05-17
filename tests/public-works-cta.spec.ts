import { expect, test } from './helpers/performance-test'

test('works archive header no longer exposes secondary template CTAs', async ({ page }) => {
  await page.goto('/works')

  await expect(page.getByRole('heading', { name: 'Works', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Start a conversation', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Read the notes', exact: true })).toHaveCount(0)
})

test('works archive keeps search as the primary header action', async ({ page }) => {
  await page.goto('/works')

  await expect(page.getByRole('textbox', { name: 'Search work' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Search works' })).toBeVisible()
  await expect(page.getByLabel('Work search mode')).toHaveCount(0)
})
