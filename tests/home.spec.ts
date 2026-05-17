import { expect, test } from './helpers/performance-test'
import { clickHeaderNavLink } from './helpers/navigation'

test('public home page renders the full primary navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto('/')

  const headerNav = page.getByRole('banner').getByRole('navigation')
  await expect(headerNav.getByRole('link', { name: 'Home', exact: true })).toBeVisible()
  await expect(headerNav.getByRole('link', { name: 'Introduction', exact: true })).toHaveAttribute('href', '/introduction')
  await expect(headerNav.getByRole('link', { name: 'Works', exact: true })).toHaveAttribute('href', '/works')
  await expect(headerNav.getByRole('link', { name: 'Study', exact: true })).toHaveAttribute('href', '/blog')
  await expect(headerNav.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', '/contact')
  await expect(headerNav.getByRole('link', { name: 'Resume', exact: true })).toHaveAttribute('href', '/resume')
})

test('primary navbar routes to every public destination', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })

  const cases = [
    { label: 'Home', href: '/', assertion: () => expect(page).toHaveURL(/\/$/) },
    { label: 'Introduction', href: '/introduction', assertion: () => expect(page.locator('main h1').first()).toBeVisible() },
    { label: 'Works', href: '/works', assertion: () => expect(page.locator('main h1')).toHaveText('Works') },
    { label: 'Study', href: '/blog', assertion: () => expect(page.locator('main h1')).toHaveText('Study') },
    { label: 'Contact', href: '/contact', assertion: () => expect(page.locator('main h1')).toHaveText('Contact') },
    { label: 'Resume', href: '/resume', assertion: () => expect(page.locator('main h1')).toHaveText('Resume') },
  ] as const

  for (const item of cases) {
    await page.goto('/')
    await clickHeaderNavLink(page, item.label)
    await expect(page).toHaveURL(new RegExp(`${item.href === '/' ? '/$' : item.href.replace('/', '\\/')}(\\?.*)?$`))
    await item.assertion()
  }
})
