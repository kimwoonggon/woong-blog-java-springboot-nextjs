import { expect, test } from './helpers/performance-test'
import { createBlogFixture } from './helpers/content-fixtures'

const tocFixtureHtml = [
  '<h1>Body H1 Fixture</h1>',
  '<p>Opening body copy for the fixture.</p>',
  '<h2>Fixture Section One</h2>',
  ...Array.from({ length: 8 }, (_, index) => `<p>Fixture section one filler ${index + 1} keeps scroll positions stable.</p>`),
  '<h2>Fixture Section Two</h2>',
  ...Array.from({ length: 8 }, (_, index) => `<p>Fixture section two filler ${index + 1} keeps scroll positions stable.</p>`),
  '<h3>Fixture Nested Section</h3>',
  '<p>Nested body copy.</p>',
].join('')

test('blog detail TOC updates its active heading as the reader moves deeper into the article', async ({ page, request }, testInfo) => {
  const blog = await createBlogFixture(request, testInfo, {
    titlePrefix: 'TOC Active Blog',
    html: tocFixtureHtml,
    tags: ['toc-active', 'blog'],
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`/blog/${blog.slug}`)
  await expect(page.getByTestId('blog-detail-title')).toHaveText(blog.title)
  await expect(page.locator('#blog-detail-content h1')).toHaveText('Body H1 Fixture')

  const toc = page.getByTestId('blog-toc')
  await expect(toc).toBeVisible()

  const links = toc.getByRole('link')
  await expect.poll(() => links.count()).toBeGreaterThan(1)

  const firstLink = links.first()
  const secondLink = links.nth(1)
  const targetId = (await secondLink.getAttribute('href'))?.replace(/^#/, '')

  expect(targetId).toBeTruthy()
  await expect.poll(() => firstLink.getAttribute('class')).toContain('bg-muted')

  await page.locator(`#${targetId}`).scrollIntoViewIfNeeded()
  await secondLink.click()

  await expect(page).toHaveURL(new RegExp(`#${targetId}$`))
  await expect.poll(() => secondLink.getAttribute('class')).toContain('bg-muted')
})
