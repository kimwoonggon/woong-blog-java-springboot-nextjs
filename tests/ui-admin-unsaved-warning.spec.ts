import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('blog editor registers beforeunload only after a real change', async ({ page }) => {
  await page.goto('/admin/blog/new')

  await expect.poll(async () => page.evaluate(() => typeof window.onbeforeunload)).toBe('object')

  await page.getByLabel('Title').fill(`Dirty blog ${Date.now()}`)
  await expect.poll(async () => page.evaluate(() => typeof window.onbeforeunload)).toBe('function')
})

test('work editor registers beforeunload only after a real change', async ({ page }) => {
  await page.goto('/admin/works/new')

  await expect.poll(async () => page.evaluate(() => typeof window.onbeforeunload)).toBe('object')

  await page.getByLabel('Title').fill(`Dirty work ${Date.now()}`)
  await expect.poll(async () => page.evaluate(() => typeof window.onbeforeunload)).toBe('function')
})

test('blog editor clears beforeunload after a successful save', async ({ page }) => {
  const updatedTitle = `Saved blog ${Date.now()}`

  await page.goto('/admin/blog')
  const editHref = await page.getByTestId('admin-blog-row').first().getByRole('link').first().getAttribute('href')
  if (!editHref) {
    throw new Error('Missing blog edit href')
  }

  await page.goto(editHref)
  const titleInput = page.getByLabel('Title')
  await titleInput.fill('')
  await titleInput.fill(updatedTitle)
  await expect.poll(async () => page.evaluate(() => typeof window.onbeforeunload)).toBe('function')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs/') && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: /Update Post/i }).click(),
  ])

  await expect.poll(async () => page.evaluate(() => typeof window.onbeforeunload)).toBe('object')
})

test('work editor clears beforeunload after a successful save', async ({ page }) => {
  const updatedTitle = `Saved work ${Date.now()}`

  await page.goto('/admin/works')
  const editHref = await page.getByTestId('admin-work-row').first().getByRole('link', { name: /Edit/i }).getAttribute('href')
  if (!editHref) {
    throw new Error('Missing work edit href')
  }

  await page.goto(editHref)
  const titleInput = page.getByLabel('Title')
  await titleInput.fill('')
  await titleInput.fill(updatedTitle)
  await expect.poll(async () => page.evaluate(() => typeof window.onbeforeunload)).toBe('function')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/works/') && res.request().method() === 'PUT' && res.ok()),
    page.getByRole('button', { name: /Update Work/i }).click(),
  ])

  await expect.poll(async () => page.evaluate(() => typeof window.onbeforeunload)).toBe('object')
})
