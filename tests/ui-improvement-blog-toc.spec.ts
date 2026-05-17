import { expect, test } from './helpers/performance-test'
import { createBlogFixture } from './helpers/content-fixtures'

const tocFixtureHtml = '<h1>Body H1 Fixture</h1><p>Intro</p><h2>Fixture Section One</h2><p>Body</p><h2>Fixture Section Two</h2>'

test('desktop blog detail renders a table of contents and anchors headings', async ({ page, request }, testInfo) => {
  const blog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'TOC Anchor Blog',
    html: tocFixtureHtml,
    tags: ['toc-anchor', 'blog'],
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`/blog/${blog.slug}`)

  const toc = page.getByTestId('blog-toc')
  await expect(toc).toBeVisible()
  const firstLink = toc.getByRole('link').first()
  await expect(firstLink).toBeVisible()

  const targetId = (await firstLink.getAttribute('href'))?.replace(/^#/, '')
  expect(targetId).toBeTruthy()

  await firstLink.click()
  await expect(page).toHaveURL(new RegExp(`#${targetId}$`))
  await expect(page.locator(`#${targetId}`)).toBeVisible()
})

test('mobile blog detail hides the table of contents', async ({ page, request }, testInfo) => {
  const blog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'TOC Mobile Blog',
    html: tocFixtureHtml,
    tags: ['toc-mobile', 'blog'],
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/blog/${blog.slug}`)

  await expect(page.getByTestId('blog-toc')).not.toBeVisible()
})
