import { expect, test } from './helpers/performance-test'
import { measureStep } from './helpers/latency'

test('works list auto-appends on mobile and stops without a Load more button', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/works')

  const firstPagePayload = await (await page.request.get('/api/public/works?page=1&pageSize=10')).json() as {
    items: unknown[]
  }
  const secondPagePayload = await (await page.request.get('/api/public/works?page=2&pageSize=10')).json() as {
    items: unknown[]
  }

  await expect(page.getByLabel('Works pagination')).toBeHidden()
  await expect(page.getByTestId('works-load-more')).toHaveCount(0)
  await expect(page.getByTestId('work-card')).toHaveCount(firstPagePayload.items.length)

  test.skip(secondPagePayload.items.length === 0, 'Current seed has no second works page to append in mobile infinite mode.')

  await measureStep(
    testInfo,
    'Works mobile auto append next page',
    'publicPagination',
    async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    },
    async () => {
      await expect.poll(async () => page.getByTestId('work-card').count()).toBeGreaterThan(firstPagePayload.items.length)

      const countAfterAppend = await page.getByTestId('work-card').count()
      expect(countAfterAppend).toBeLessThanOrEqual(firstPagePayload.items.length + secondPagePayload.items.length)
    },
  )
})

test('works list uses infinite feed on tablet (820px) and appends next page', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.goto('/works')

  const firstPagePayload = await (await page.request.get('/api/public/works?page=1&pageSize=10')).json() as {
    items: unknown[]
  }
  const secondPagePayload = await (await page.request.get('/api/public/works?page=2&pageSize=10')).json() as {
    items: unknown[]
  }
  test.skip(secondPagePayload.items.length === 0, 'Current seed has no second page to append in infinite mode.')

  const expectedInitialCount = firstPagePayload.items.length
  const expectedCountAfterAppend = expectedInitialCount + secondPagePayload.items.length

  await expect(page.getByLabel('Works pagination')).toBeHidden()
  await expect(page.getByTestId('work-card')).toHaveCount(expectedInitialCount)

  await measureStep(
    testInfo,
    'Works tablet load more appends next page',
    'publicPagination',
    async () => {
      await page.getByTestId('works-load-more').click()
    },
    async () => {
      await expect.poll(async () => page.getByTestId('work-card').count()).toBeGreaterThan(expectedInitialCount)

      const countAfterAppend = await page.getByTestId('work-card').count()
      expect(countAfterAppend).toBeLessThanOrEqual(expectedCountAfterAppend)
    },
  )
})

test('works list keeps desktop pagination and hides infinite controls at >=1024px', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 960 })
  await page.goto('/works')

  const pagination = page.getByLabel('Works pagination')
  await expect(pagination).toBeVisible()
  await expect(page.getByTestId('works-load-more')).toHaveCount(0)
  const payload = await (await page.request.get('/api/public/works?page=1&pageSize=8')).json() as { totalPages: number }
  test.skip(payload.totalPages < 2, 'Clean seed does not have a second works page.')
  await expect(pagination.getByRole('link', { name: 'Next' })).toBeVisible()

  await measureStep(
    testInfo,
    'Works desktop pagination next navigation',
    'publicPagination',
    async () => {
      const nextLink = pagination.getByRole('link', { name: 'Next' })
      await expect(nextLink).toHaveAttribute('href', /page=2/)
      await page.goto((await nextLink.getAttribute('href')) ?? '/works?page=2&pageSize=8')
      await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('2')
    },
    async () => {
      await expect(page.getByLabel('Works pagination').getByRole('link', { name: '2', exact: true })).toHaveClass(/bg-sky-500/)
    },
  )
})
