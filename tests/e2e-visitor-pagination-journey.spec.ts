import { expect, test } from './helpers/performance-test'

function currentSearchParam(pageUrl: string, name: string) {
  return new URL(pageUrl).searchParams.get(name)
}

test('E2E-004 visitor can keep a paginated reading path stable across list and detail pages', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 })
  const payload = await (await page.request.get('/api/public/blogs?page=1&pageSize=2')).json() as { totalPages: number }
  test.skip(payload.totalPages < 2, 'Clean seed does not have a second study page.')
  await page.goto('/blog?page=2&pageSize=2&__qaTagged=1')

  const pagination = page.getByLabel('Study pagination')
  await expect(pagination).toBeVisible()
  await expect.poll(() => currentSearchParam(page.url(), 'page'), { timeout: 15000 }).toBe('2')
  await expect.poll(() => currentSearchParam(page.url(), 'pageSize'), { timeout: 15000 }).toBeTruthy()
  const visibleBlogCards = await page.getByTestId('blog-card').count()
  expect(visibleBlogCards).toBeGreaterThan(1)
  await expect(page.getByTestId('blog-card').first()).toHaveAttribute('href', /^\/blog\/.+/)

  await pagination.getByRole('link', { name: 'Previous' }).click()
  await expect.poll(() => currentSearchParam(page.url(), 'page'), { timeout: 15000 }).toBe('1')
  await expect.poll(() => currentSearchParam(page.url(), 'pageSize'), { timeout: 15000 }).toBeTruthy()

  await pagination.getByRole('link', { name: 'Next' }).click()
  await expect.poll(() => currentSearchParam(page.url(), 'page'), { timeout: 15000 }).toBe('2')
  await expect.poll(() => currentSearchParam(page.url(), 'pageSize'), { timeout: 15000 }).toBeTruthy()

  const secondPageCard = page.getByTestId('blog-card').first()
  await expect(secondPageCard).toBeVisible()
  await secondPageCard.click()

  await expect(page).toHaveURL(/\/blog\/.+(?:\?|&)returnTo=%2Fblog%3Fpage%3D2%26pageSize%3D\d+(?:&|%26)relatedPage=2/)
  await expect(page.getByTestId('blog-related-shell')).toBeVisible()
  await expect(page.locator('section').filter({ has: page.getByRole('heading', { name: 'More Studies' }) }).getByText(/^Page 2 of \d+$/)).toBeVisible()
})

test('E2E-004 visitor can continue the same paginated path through the works archive', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 })
  const payload = await (await page.request.get('/api/public/works?page=1&pageSize=2')).json() as { totalPages: number }
  test.skip(payload.totalPages < 2, 'Clean seed does not have a second works page.')
  await page.goto('/works?page=2&pageSize=2')

  const pagination = page.getByLabel('Works pagination')
  await expect(pagination).toBeVisible()
  await expect.poll(() => currentSearchParam(page.url(), 'page'), { timeout: 15000 }).toBe('2')
  await expect.poll(() => currentSearchParam(page.url(), 'pageSize'), { timeout: 15000 }).toBeTruthy()
  const visibleWorkCards = await page.getByTestId('work-card').count()
  expect(visibleWorkCards).toBeGreaterThan(1)

  await page.getByTestId('work-card').first().click()
  await expect(page).toHaveURL(/\/works\/.+(?:\?|&)returnTo=%2Fworks%3Fpage%3D2%26pageSize%3D\d+/)
  await expect(page.getByTestId('work-related-shell')).toBeVisible()
  await expect(page.locator('section').filter({ has: page.getByRole('heading', { name: 'More Works' }) }).getByText(/^Page 2 of \d+$/)).toBeVisible()
})
