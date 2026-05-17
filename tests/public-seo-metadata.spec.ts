import { expect, test, type Page } from './helpers/performance-test'
import { createWorkFixture } from './helpers/content-fixtures'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

async function expectVisibleHeaderMetadata(page: Page) {
  const title = (await page.locator('article header h1').innerText()).trim()

  await expect.poll(() => page.title()).toContain(title)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/)
}

async function firstPublicSlug(page: Page, collection: 'blogs' | 'works') {
  const response = await page.request.get(`/api/public/${collection}?page=1&pageSize=1`)
  const payload = await response.json() as { items?: Array<{ slug?: string }> }
  const slug = payload.items?.[0]?.slug
  test.skip(!slug, `No public ${collection} available in this environment.`)
  return slug!
}

test('blog detail metadata uses the visible article title and excerpt', async ({ page }) => {
  await page.goto(`/blog/${await firstPublicSlug(page, 'blogs')}`)
  await expectVisibleHeaderMetadata(page)
})

test('work detail metadata uses the visible project title and excerpt', async ({ page }) => {
  await page.goto(`/works/${await firstPublicSlug(page, 'works')}`)
  await expectVisibleHeaderMetadata(page)
})

test('work detail exposes og:image and twitter:image when thumbnail is available', async ({ page }) => {
  await page.goto(`/works/${await firstPublicSlug(page, 'works')}`)

  const ogImage = page.locator('meta[property="og:image"]').first()
  const twitterImage = page.locator('meta[name="twitter:image"]').first()
  const hasSocialImageMeta = await ogImage.count() > 0 && await twitterImage.count() > 0
  test.skip(!hasSocialImageMeta, 'No work thumbnail/video thumbnail metadata is available in this environment.')
  await expect(ogImage).toHaveAttribute('content', /.+/)
  await expect(twitterImage).toHaveAttribute('content', /.+/)
})

test('work detail metadata prefers socialShareMessage over excerpt for description fields', async ({ page, request }, testInfo) => {
  const shareMessage = `Social share message ${Date.now()}`
  const work = await createWorkFixture(request, testInfo, {
    titlePrefix: 'SEO Share Message Work',
    html: '<p>No heading body for metadata check.</p>',
    excerpt: 'Excerpt fallback should not be used',
    allPropertiesJson: JSON.stringify({ socialShareMessage: shareMessage }),
  })

  await page.goto(`/works/${work.slug}`)

  await expect(page.locator('meta[name=\"description\"]')).toHaveAttribute('content', shareMessage)
  await expect(page.locator('meta[property=\"og:description\"]')).toHaveAttribute('content', shareMessage)
  await expect(page.locator('meta[name=\"twitter:description\"]')).toHaveAttribute('content', shareMessage)
})

test('site exposes a branded svg favicon', async ({ page, request }) => {
  await page.goto('/')

  const icon = page.locator('link[rel~="icon"]').first()
  await expect(icon).toHaveAttribute('href', '/favicon.svg')

  const response = await request.get('/favicon.svg')
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['content-type']).toContain('image/svg+xml')
  const svg = await response.text()
  expect(svg).toContain('aria-label="W"')
  expect(svg).not.toContain('#f3434f')
})
