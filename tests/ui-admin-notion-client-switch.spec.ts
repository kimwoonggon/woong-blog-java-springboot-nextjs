import { expect, test } from './helpers/performance-test'

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

test('switching documents in notion view keeps the editor visible while changing the active document', async ({ page }) => {
  await page.goto('/admin/blog/notion')

  await page.getByTestId('notion-library-trigger').click()
  const listItems = page.getByTestId('notion-blog-list-item')
  await page.waitForTimeout(500)
  const itemCount = await listItems.count()
  test.skip(itemCount < 2, 'Need at least two blog documents for client-side switching coverage')
  await expect(listItems.first()).toBeVisible()

  const hrefs = await listItems.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLAnchorElement).getAttribute('href') ?? ''),
  )
  const initialHref = hrefs.find(Boolean) ?? ''
  const nextIndex = hrefs.findIndex((href) => href && href !== initialHref)
  test.skip(!initialHref || nextIndex < 0, 'Need two distinct notion document links for client-side switching coverage')

  await page.goto(new URL(initialHref, BASE_URL).toString())
  await expect(page.locator('.tiptap.ProseMirror').first()).toBeVisible()

  const initialUrl = page.url()
  const initialTitle = await page.getByLabel('Title').inputValue()

  await page.getByTestId('notion-library-trigger').click()
  await page.getByTestId('notion-blog-list-item').nth(nextIndex).click()

  await expect(page).not.toHaveURL(initialUrl)
  await expect(page).toHaveURL(/\/admin\/blog\/notion\?id=/)
  await expect(page.locator('.tiptap.ProseMirror').first()).toBeVisible()
  await expect(page.getByLabel('Title')).not.toHaveValue(initialTitle)
})

test('selected notion document persists after reload via url state', async ({ page }) => {
  await page.goto('/admin/blog/notion')

  await page.getByTestId('notion-library-trigger').click()
  const listItems = page.getByTestId('notion-blog-list-item')
  await page.waitForTimeout(500)
  const itemCount = await listItems.count()
  test.skip(itemCount < 2, 'Need at least two blog documents for reload persistence coverage')
  await expect(listItems.first()).toBeVisible()

  const hrefs = await listItems.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLAnchorElement).getAttribute('href') ?? ''),
  )
  const initialHref = hrefs.find(Boolean) ?? ''
  const nextHref = hrefs.find((href) => href && href !== initialHref) ?? ''
  test.skip(!initialHref || !nextHref, 'Need two distinct notion document links for reload persistence coverage')

  await page.goto(new URL(nextHref, BASE_URL).toString())

  await expect(page.locator('.tiptap.ProseMirror').first()).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/blog\/notion\?id=/)
  const selectedUrl = page.url()
  const selectedTitle = await page.getByLabel('Title').inputValue()

  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('.tiptap.ProseMirror').first()).toBeVisible()
  await expect(page).toHaveURL(selectedUrl)
  await expect(page.getByLabel('Title')).toHaveValue(selectedTitle)
})
