import { expect, test } from './helpers/performance-test'
import { createBlogFixture } from './helpers/content-fixtures'

test('public detail headings reserve scroll margin under the sticky navbar', async ({ page, request }, testInfo) => {
  const blog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'Scroll Margin Blog',
    html: '<h1>Body H1 Fixture</h1><p>Intro</p><h2>Fixture Section One</h2><p>Body</p>',
    tags: ['scroll-margin', 'blog'],
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`/blog/${blog.slug}`)

  const firstLink = page.getByTestId('blog-toc').getByRole('link').first()
  const targetId = (await firstLink.getAttribute('href'))?.replace(/^#/, '')
  expect(targetId).toBeTruthy()

  await firstLink.click()

  const top = await page.locator(`#${targetId}`).evaluate((element) => element.getBoundingClientRect().top)
  expect(top).toBeGreaterThanOrEqual(80)
})
