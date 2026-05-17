import { expect, test, type Page } from './helpers/performance-test'
import { createBlogFixture, createWorkFixture } from './helpers/content-fixtures'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

async function activeElementState(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement
    const text = active?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

    return {
      label: active?.getAttribute('aria-label')
        || active?.getAttribute('title')
        || text
        || active?.id
        || active?.tagName
        || '',
      inDialog: Boolean(active?.closest('[data-slot="dialog-content"]')),
    }
  })
}

async function expectDeleteDialogWithoutBrowserPrompt(page: Page, path: string, rowTestId: string, rowTitle: string) {
  let browserDialogTriggered = false
  let deleteRequests = 0
  page.on('dialog', async (dialog) => {
    browserDialogTriggered = true
    await dialog.dismiss()
  })
  page.on('request', (request) => {
    if (request.method() === 'DELETE' && request.url().includes('/api/admin/')) {
      deleteRequests += 1
    }
  })

  await page.goto(path)
  await page.getByLabel(/Search .* titles/).fill(rowTitle)

  const row = page.getByTestId(rowTestId).filter({ hasText: rowTitle }).first()
  await expect(row).toBeVisible()

  await row.getByRole('button', { name: 'Delete' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Delete' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Delete' })).toHaveAttribute('data-variant', 'destructive')
  expect(deleteRequests).toBe(0)
  await page.waitForTimeout(100)
  expect(browserDialogTriggered).toBeFalsy()

  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(row).toBeVisible()
  await expect(page.getByText(rowTitle)).toBeVisible()
  expect(deleteRequests).toBe(0)
  await expect(page.getByText(/deleted successfully/i)).toHaveCount(0)
}

test('blog delete uses an in-app dialog instead of browser confirm', async ({ page, request }, testInfo) => {
  const fixture = await createBlogFixture(request, testInfo, {
    titlePrefix: 'Delete Dialog Blog',
    published: false,
  })

  await expectDeleteDialogWithoutBrowserPrompt(page, '/admin/blog', 'admin-blog-row', fixture.title)
})

test('works delete uses an in-app dialog instead of browser confirm', async ({ page, request }, testInfo) => {
  const fixture = await createWorkFixture(request, testInfo, {
    titlePrefix: 'Delete Dialog Work',
    published: false,
  })

  await expectDeleteDialogWithoutBrowserPrompt(page, '/admin/works', 'admin-work-row', fixture.title)
})

test('blog delete dialog supports keyboard focus, Escape, cancel, and confirm', async ({ page, request }, testInfo) => {
  const fixture = await createBlogFixture(request, testInfo, {
    titlePrefix: 'Keyboard Delete Dialog Blog',
    published: false,
  })
  let deleteRequests = 0
  page.on('request', (requestEvent) => {
    if (requestEvent.method() === 'DELETE' && requestEvent.url().includes('/api/admin/blogs/')) {
      deleteRequests += 1
    }
  })

  await page.goto('/admin/blog')
  await page.getByLabel('Search blog titles').fill(fixture.title)
  const row = page.getByTestId('admin-blog-row').filter({ hasText: fixture.title }).first()
  await expect(row).toBeVisible()

  const deleteButton = row.getByRole('button', { name: new RegExp(`Delete post: ${fixture.title}`) })
  await deleteButton.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: new RegExp(`Delete ${fixture.title}`) })
  await expect(dialog).toBeVisible()
  await expect.poll(() => activeElementState(page)).toMatchObject({ inDialog: true })

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(deleteButton).toBeFocused()
  await expect(row).toBeVisible()
  expect(deleteRequests).toBe(0)

  await page.keyboard.press('Enter')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel' }).focus()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
  await expect(row).toBeVisible()
  expect(deleteRequests).toBe(0)

  await deleteButton.focus()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete' }).focus()
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/admin/blogs/')
      && response.request().method() === 'DELETE'
      && response.ok(),
    ),
    page.keyboard.press('Enter'),
  ])

  await expect(dialog).toBeHidden()
  await expect(row).toHaveCount(0, { timeout: 20_000 })
  expect(deleteRequests).toBe(1)
})
