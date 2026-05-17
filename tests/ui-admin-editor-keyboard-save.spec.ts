import { expect, test, type Page } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s'

async function getFirstAdminEditHref(page: Page, rowTestId: string, hrefPrefix: string) {
  const href = await page
    .getByTestId(rowTestId)
    .first()
    .locator(`a[href^="${hrefPrefix}"]`)
    .first()
    .getAttribute('href')

  expect(href).toBeTruthy()
  return href!
}

test('blog editor saves from the keyboard shortcut', async ({ page }) => {
  const updatedTitle = `Keyboard blog save ${Date.now()}`

  await page.goto('/admin/blog')
  const editHref = await getFirstAdminEditHref(page, 'admin-blog-row', '/admin/blog/')
  await page.goto(editHref)
  await expect(page).toHaveURL(/\/admin\/blog\/[^/]+$/)

  const titleInput = page.locator('input[name="title"]').first()
  await expect(titleInput).toBeVisible()

  await titleInput.fill(updatedTitle)
  await titleInput.click()

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs/') && res.request().method() === 'PUT' && res.ok()),
    page.keyboard.press(saveShortcut),
  ])

  expect(response.ok()).toBeTruthy()
  await expect(titleInput).toHaveValue(updatedTitle)
})

test('work editor saves from the keyboard shortcut', async ({ page }) => {
  const updatedTitle = `Keyboard work save ${Date.now()}`

  await page.goto('/admin/works')
  const editHref = await getFirstAdminEditHref(page, 'admin-work-row', '/admin/works/')
  await page.goto(editHref)
  await expect(page).toHaveURL(/\/admin\/works\/[^?]+/)
  await expect(page.getByRole('heading', { name: 'Edit Work' })).toBeVisible()

  const titleInput = page.locator('input[name="title"]').first()
  await expect(titleInput).toBeVisible()

  await titleInput.fill(updatedTitle)
  await titleInput.click()

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works/') && res.request().method() === 'PUT' && res.ok()),
    page.keyboard.press(saveShortcut),
  ])

  expect(response.ok()).toBeTruthy()
  await expect(titleInput).toHaveValue(updatedTitle)
})
