import { expect, test } from './helpers/performance-test'
import { measureStep } from './helpers/latency'
import { createBlogFixture } from './helpers/content-fixtures'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('study list auto-appends the next page on mobile without a Load more button', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog')

  await expect(page.getByLabel('Study pagination')).toBeHidden()
  await expect(page.getByTestId('blog-load-more')).toHaveCount(0)
  await expect(page.getByTestId('blog-card')).toHaveCount(10)

  await measureStep(
    testInfo,
    'Study mobile auto append next page',
    'publicPagination',
    async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    },
    async () => {
      await expect.poll(() => page.getByTestId('blog-card').count()).toBeGreaterThan(10)
    },
  )
})

test('study list keeps desktop pagination layout after mobile reading then desktop browser back', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog')

  await expect(page.getByTestId('blog-card')).toHaveCount(10)

  await measureStep(
    testInfo,
    'Study mobile auto append before detail navigation',
    'publicPagination',
    async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    },
    async () => {
      await expect.poll(() => page.getByTestId('blog-card').count()).toBeGreaterThan(10)
    },
  )

  const targetCard = page.getByTestId('blog-card').nth(11)
  await expect(targetCard).toBeVisible()
  await targetCard.scrollIntoViewIfNeeded()
  await targetCard.click()

  await expect(page).toHaveURL(/\/blog\/.+/)
  await page.setViewportSize({ width: 1280, height: 960 })
  await page.goBack()

  await expect(page).toHaveURL(/\/blog/)
  await expect(page.getByTestId('blog-responsive-feed')).toHaveAttribute('data-feed-mode', 'pagination')
  await expect(page.getByLabel('Study pagination')).toBeVisible()
  await expect(page.getByTestId('blog-load-more')).toHaveCount(0)
  await expect(page.getByTestId('blog-card')).toHaveCount(12)
})

test('study list keeps manual Load more on tablet and desktop pagination at >=1024px', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.goto('/blog')

  await expect(page.getByLabel('Study pagination')).toBeHidden()
  await expect(page.getByTestId('blog-load-more')).toBeVisible()
  await expect.poll(() => page.getByTestId('blog-card').count()).toBeGreaterThanOrEqual(10)
  const initialCount = await page.getByTestId('blog-card').count()

  await measureStep(
    testInfo,
    'Study tablet load more appends next page',
    'publicPagination',
    async () => {
      await page.getByTestId('blog-load-more').click()
    },
    async () => {
      await expect.poll(() => page.getByTestId('blog-card').count()).toBeGreaterThan(initialCount)
    },
  )

  await page.setViewportSize({ width: 1280, height: 960 })
  await page.goto('/blog')

  const pagination = page.getByLabel('Study pagination')
  await expect(pagination).toBeVisible()
  await expect(page.getByTestId('blog-load-more')).toHaveCount(0)
  const payload = await (await page.request.get('/api/public/blogs?page=1&pageSize=12')).json() as { totalPages: number }
  test.skip(payload.totalPages < 2, 'Clean seed does not have a second study page.')
  await expect(pagination.getByRole('link', { name: 'Next' })).toBeVisible()
})

test('study cards show multiple saved tags and never substitute body text for a blank excerpt', async ({ page, request }, testInfo) => {
  const fixture = await createBlogFixture(request, testInfo, {
    titlePrefix: 'Blank Excerpt Study',
    excerpt: '',
    html: '<p>Body text that must not appear as the summary fallback.</p>',
    tags: ['playwright', 'hotfix', 'excerpt-blank'],
  })

  await page.goto(`/blog?query=${encodeURIComponent(fixture.tag)}`)

  const card = page.getByTestId('blog-card').first()
  await expect(card).toBeVisible()
  await expect(card).toContainText(fixture.title)
  await expect(card).toContainText('playwright')
  await expect(card).toContainText('hotfix')
  await expect(card).toContainText('excerpt-blank')
  await expect(card).not.toContainText('Body text that must not appear as the summary fallback.')
})
