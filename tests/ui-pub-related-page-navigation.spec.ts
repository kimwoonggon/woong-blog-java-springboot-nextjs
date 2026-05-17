import { expect, test } from './helpers/performance-test'

test('blog detail prev-next keeps the originating related page state', async ({ page }) => {
  const blogListPayload = await (await page.request.get('/api/public/blogs?page=1&pageSize=1')).json() as { totalItems?: number; totalPages?: number }
  test.skip((blogListPayload.totalItems ?? 0) < 2, 'Need at least two blog posts for prev-next coverage.')

  const listPage = Math.min(5, Math.max(1, blogListPayload.totalPages ?? 1))
  await page.setViewportSize({ width: 1440, height: 1600 })
  await page.goto(`/blog?page=${listPage}&pageSize=1`)

  const firstCard = page.getByTestId('blog-card').first()
  await expect(firstCard).toBeVisible()
  await firstCard.click()

  await expect(page).toHaveURL(/relatedPage=\d+/)
  const relatedPage = new URL(page.url()).searchParams.get('relatedPage')
  expect(relatedPage).toBeTruthy()
  await expect(page.getByTestId('blog-related-shell')).toBeVisible()

  const nextLink = page.getByTestId('blog-prev-next').getByRole('link', { name: /Next|Previous/ }).first()
  test.skip(await nextLink.count() === 0, 'No blog prev/next link is available for this selected item.')
  await expect(nextLink).toHaveAttribute('href', new RegExp(`relatedPage=${relatedPage}`))
  await nextLink.click()

  await expect(page).toHaveURL(new RegExp(`relatedPage=${relatedPage}`))
  await expect(page.getByTestId('blog-related-shell')).toBeVisible()
})

test('work detail prev-next keeps the originating related page state', async ({ page }) => {
  const worksListPayload = await (await page.request.get('/api/public/works?page=1&pageSize=1')).json() as { totalItems?: number; totalPages?: number }
  test.skip((worksListPayload.totalItems ?? 0) < 2, 'Need at least two works for prev-next coverage.')

  const listPage = Math.min(5, Math.max(1, worksListPayload.totalPages ?? 1))
  await page.setViewportSize({ width: 1440, height: 1600 })
  await page.goto(`/works?page=${listPage}&pageSize=1`)

  const firstCard = page.getByTestId('work-card').first()
  await expect(firstCard).toBeVisible()
  await firstCard.click()

  await expect(page).toHaveURL(/relatedPage=\d+/)
  const relatedPage = new URL(page.url()).searchParams.get('relatedPage')
  expect(relatedPage).toBeTruthy()
  await expect(page.getByTestId('work-related-shell')).toBeVisible()

  const nextLink = page.getByTestId('work-prev-next').getByRole('link', { name: /Next|Previous/ }).first()
  test.skip(await nextLink.count() === 0, 'No work prev/next link is available for this selected item.')
  await expect(nextLink).toHaveAttribute('href', new RegExp(`relatedPage=${relatedPage}`))
  await nextLink.click()

  await expect(page).toHaveURL(new RegExp(`relatedPage=${relatedPage}`))
  await expect(page.getByTestId('work-related-shell')).toBeVisible()
})
