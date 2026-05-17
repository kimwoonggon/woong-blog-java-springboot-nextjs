import { expect, test } from './helpers/performance-test'
import { expectDarkHtml, gotoWithTheme } from './helpers/ui-improvement'

test.setTimeout(90_000)

test('E2E-007 dark mode stays coherent across the main public journey', async ({ page }) => {
  const cases = [
    { path: '/', assertion: () => expect(page.getByRole('heading', { name: 'Works', exact: true })).toBeVisible() },
    { path: '/works', assertion: () => expect(page.locator('main h1')).toHaveText('Works') },
    { path: '/works/seeded-work', assertion: () => expect(page.getByTestId('work-detail-title')).toBeVisible() },
    { path: '/blog', assertion: () => expect(page.locator('main h1')).toHaveText('Study') },
    { path: '/blog/seeded-blog', assertion: () => expect(page.getByTestId('blog-detail-title')).toBeVisible() },
    { path: '/introduction', assertion: () => expect(page.locator('main h1').first()).toBeVisible() },
    { path: '/contact', assertion: () => expect(page.locator('main h1')).toHaveText('Contact') },
    { path: '/resume', assertion: () => expect(page.locator('main h1')).toHaveText('Resume') },
  ] as const

  for (const item of cases) {
    await gotoWithTheme(page, item.path, 'dark')
    await expectDarkHtml(page)
    await item.assertion()
  }
})
