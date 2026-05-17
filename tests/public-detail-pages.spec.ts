import { expect, test } from './helpers/performance-test'

test('contact page renders heading and contact content', async ({ page }) => {
  await page.goto('/contact')
  await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible()
  await expect(page.locator('main')).toContainText(/@|contact|문의|mail/i)
})

test('work detail page renders seeded detail content and stable related cards', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 })
  const worksResponse = await page.request.get('/api/public/works?page=1&pageSize=1')
  expect(worksResponse.ok()).toBeTruthy()
  const worksPayload = await worksResponse.json() as { items: Array<{ slug: string; title: string }> }
  const work = worksPayload.items[0]
  expect(work).toBeTruthy()

  await page.goto(`/works/${work.slug}`)
  await expect(page.getByTestId('work-detail-title')).toHaveText(work.title)

  const relatedWorkCards = page.getByTestId('related-work-card')
  if ((await relatedWorkCards.count()) === 0) {
    return
  }

  await expect(relatedWorkCards.first()).toBeVisible()

  const heights = await relatedWorkCards.evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().height))
  )

  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(80)
})

test('blog detail page renders seeded blog content and stable related cards', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 })
  const blogsResponse = await page.request.get('/api/public/blogs?page=1&pageSize=1')
  expect(blogsResponse.ok()).toBeTruthy()
  const blogsPayload = await blogsResponse.json() as { items: Array<{ slug: string; title: string }> }
  const blog = blogsPayload.items[0]
  expect(blog).toBeTruthy()

  await page.goto(`/blog/${blog.slug}`)
  await expect(page.getByTestId('blog-detail-title')).toHaveText(blog.title)

  const relatedBlogCards = page.getByTestId('related-blog-card')
  if ((await relatedBlogCards.count()) === 0) {
    return
  }

  await expect(relatedBlogCards.first()).toBeVisible()

  const heights = await relatedBlogCards.evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().height))
  )

  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(80)
})
