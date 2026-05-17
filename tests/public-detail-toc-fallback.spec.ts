import { expect, test } from './helpers/performance-test'
import { createBlogFixture, createWorkFixture } from './helpers/content-fixtures'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('blog detail keeps TOC card visible with fallback copy when headings are missing', async ({ page, request }, testInfo) => {
  const blog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'TOC Fallback Blog',
    html: '<p>This fixture intentionally has no headings.</p>',
    tags: ['toc-fallback', 'blog'],
  })

  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto(`/blog/${blog.slug}`)

  const toc = page.getByTestId('blog-toc')
  await expect(toc).toBeVisible()
  await expect(toc.getByTestId('blog-toc-empty')).toBeVisible()
  await expect(toc.getByRole('link')).toHaveCount(0)

  const body = page.getByTestId('blog-detail-body')
  const layout = page.getByTestId('blog-article-content-layout')
  const [bodyBox, tocBox, layoutBox] = await Promise.all([body.boundingBox(), toc.boundingBox(), layout.boundingBox()])
  expect(bodyBox).toBeTruthy()
  expect(tocBox).toBeTruthy()
  expect(layoutBox).toBeTruthy()
  expect(bodyBox!.x + bodyBox!.width).toBeLessThanOrEqual(tocBox!.x - 24)
  expect(tocBox!.y + tocBox!.height).toBeLessThanOrEqual(layoutBox!.y + layoutBox!.height + 2)
})

test('work detail keeps TOC card visible with fallback copy when headings are missing', async ({ page, request }, testInfo) => {
  const work = await createWorkFixture(request, testInfo, {
    titlePrefix: 'TOC Fallback Work',
    html: '<p>This work intentionally has no heading blocks.</p>',
    tags: ['toc-fallback', 'work'],
    allPropertiesJson: '{}',
  })

  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto(`/works/${work.slug}`)

  const toc = page.getByTestId('work-toc')
  await expect(toc).toBeVisible()
  await expect(toc.getByTestId('blog-toc-empty')).toBeVisible()
  await expect(toc.getByRole('link')).toHaveCount(0)

  const body = page.getByTestId('work-detail-body')
  const layout = page.getByTestId('work-article-content-layout')
  const [bodyBox, tocBox, layoutBox] = await Promise.all([body.boundingBox(), toc.boundingBox(), layout.boundingBox()])
  expect(bodyBox).toBeTruthy()
  expect(tocBox).toBeTruthy()
  expect(layoutBox).toBeTruthy()
  expect(bodyBox!.x + bodyBox!.width).toBeLessThanOrEqual(tocBox!.x - 24)
  expect(tocBox!.y + tocBox!.height).toBeLessThanOrEqual(layoutBox!.y + layoutBox!.height + 2)
})
