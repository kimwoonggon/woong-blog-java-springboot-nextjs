import { expect, test } from './helpers/performance-test'
import { createBlogFixture } from './helpers/content-fixtures'

test('blog table of contents stays in a right rail instead of covering article content', async ({ page, request }, testInfo) => {
  const blog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'TOC Layout Blog',
    html: '<h1>Body H1 Fixture</h1><p>Intro</p><h2>Fixture Section One</h2><p>Body</p><h2>Fixture Section Two</h2>',
    tags: ['toc-layout', 'blog'],
  })

  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`/blog/${blog.slug}`)

  const body = page.getByTestId('blog-detail-body')
  const toc = page.getByTestId('blog-toc')
  const contentLayout = page.getByTestId('blog-article-content-layout')

  await expect(page.getByTestId('blog-detail-title')).toHaveText(blog.title)
  await expect(body).toBeVisible()
  await expect.poll(() => toc.getByRole('link').count()).toBeGreaterThan(0)
  await expect(toc).toBeVisible()

  const bodyBox = await body.boundingBox()
  const tocBox = await toc.boundingBox()
  const contentLayoutBox = await contentLayout.boundingBox()

  expect(bodyBox).toBeTruthy()
  expect(tocBox).toBeTruthy()
  expect(contentLayoutBox).toBeTruthy()
  expect(bodyBox!.x + bodyBox!.width).toBeLessThanOrEqual(tocBox!.x - 24)
  expect(tocBox!.y + tocBox!.height).toBeLessThanOrEqual(contentLayoutBox!.y + contentLayoutBox!.height + 2)
})
