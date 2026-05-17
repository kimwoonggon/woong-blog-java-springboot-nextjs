import { type APIRequestContext, type TestInfo } from '@playwright/test'
import { expect, test } from './helpers/performance-test'
import { ensureAdminApiContext } from './helpers/auth'
import { createBlogFixture } from './helpers/content-fixtures'

type PublicListPayload = {
  totalItems: number
  totalPages: number
}

const BLOG_EDGE_PAGE_SIZE = 12
const BLOG_EDGE_REQUIRED_PAGES = 3

async function getCsrf(request: APIRequestContext) {
  const csrfResponse = await request.get('/api/auth/csrf')
  expect(csrfResponse.ok()).toBeTruthy()
  return await csrfResponse.json() as { requestToken: string; headerName: string }
}

async function readPublicBlogSummary(request: APIRequestContext) {
  const response = await request.get(`/api/public/blogs?page=1&pageSize=${BLOG_EDGE_PAGE_SIZE}`, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
  expect(response.ok()).toBeTruthy()
  return await response.json() as PublicListPayload
}

async function revalidatePublicBlogList(request: APIRequestContext) {
  const adminRequest = await ensureAdminApiContext(request)
  const csrf = await getCsrf(adminRequest)
  const response = await adminRequest.post('/revalidate-public', {
    headers: {
      'Content-Type': 'application/json',
      [csrf.headerName]: csrf.requestToken,
    },
    data: {
      paths: ['/blog'],
    },
  })
  expect(response.ok()).toBeTruthy()
}

async function ensureBlogEdgePages(request: APIRequestContext, testInfo: TestInfo) {
  const minimumItemsForNextFromPageTwo = (BLOG_EDGE_PAGE_SIZE * (BLOG_EDGE_REQUIRED_PAGES - 1)) + 1
  const summary = await readPublicBlogSummary(request)
  const missingItems = Math.max(0, minimumItemsForNextFromPageTwo - summary.totalItems)

  for (let index = 0; index < missingItems; index += 1) {
    await createBlogFixture(request, testInfo, {
      titlePrefix: 'Blog Edge Navigation Fixture',
      excerpt: 'Published fixture for deterministic public blog edge navigation.',
      html: '<p>Published fixture for deterministic public blog edge navigation.</p>',
      tags: ['playwright', 'edge-navigation'],
    })
  }

  await revalidatePublicBlogList(request)
  await expect.poll(
    async () => (await readPublicBlogSummary(request)).totalPages,
    { timeout: 15_000 },
  ).toBeGreaterThanOrEqual(BLOG_EDGE_REQUIRED_PAGES)
}

test('introduction does not expose left/right edge navigation links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 })
  await page.goto('/introduction')

  await expect(page.getByRole('link', { name: '이전 페이지로 가기' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '다음 페이지로 가기' })).toHaveCount(0)
})

test('blog edge arrows paginate between blog pages', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1800 })
  await ensureBlogEdgePages(page.request, testInfo)
  await page.goto('/blog?page=2&pageSize=10')

  await expect(page.getByRole('link', { name: '이전 페이지로 가기' })).toHaveAttribute('href', '/blog?page=1&pageSize=12')
  await expect(page.getByRole('link', { name: '다음 페이지로 가기' })).toHaveAttribute('href', '/blog?page=3&pageSize=12')
})

test('works edge arrows paginate between work pages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 })
  const payload = await (await page.request.get('/api/public/works?page=1&pageSize=8')).json() as { totalPages: number }
  test.skip(payload.totalPages < 3, 'Clean seed does not have enough work pages for edge arrows.')
  await page.goto('/works?page=2&pageSize=6')

  await expect(page.getByRole('link', { name: '이전 페이지로 가기' })).toHaveAttribute('href', '/works?page=1&pageSize=8')
  await expect(page.getByRole('link', { name: '다음 페이지로 가기' })).toHaveAttribute('href', '/works?page=3&pageSize=8')
})
