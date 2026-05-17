import { expect, type Page } from '@playwright/test'

export type ViewportClass = 'phone' | 'tablet' | 'desktop'

export async function getViewportClass(page: Page): Promise<ViewportClass> {
  const viewport = page.viewportSize()
  const width = viewport?.width ?? await page.evaluate(() => window.innerWidth)

  if (width < 768) {
    return 'phone'
  }

  if (width < 1280) {
    return 'tablet'
  }

  return 'desktop'
}

export async function expectedPublicBlogPageSize(page: Page) {
  const viewportClass = await getViewportClass(page)
  return viewportClass === 'desktop' ? 12 : 10
}

export async function expectedPublicWorksPageSize(page: Page) {
  const viewportClass = await getViewportClass(page)
  return viewportClass === 'desktop' ? 8 : 10
}

export async function expectedAdminTablePageSize(page: Page) {
  const viewportClass = await getViewportClass(page)
  return viewportClass === 'desktop' ? 12 : viewportClass === 'tablet' ? 8 : 6
}

export async function expectResponsiveNavMode(page: Page) {
  const viewportClass = await getViewportClass(page)
  const banner = page.getByRole('banner')
  const inlineNav = banner.getByRole('navigation')
  const menuButton = page.getByRole('button', { name: 'Toggle Menu' })

  if (viewportClass === 'desktop') {
    await expect(inlineNav).toBeVisible()
    await expect(page.getByTestId('theme-toggle')).toBeVisible()
    await expect(menuButton).toHaveCount(0)
    return
  }

  await expect(inlineNav).toBeHidden()
  await expect(menuButton).toBeVisible()
}

export async function toggleThemeForViewport(page: Page) {
  const viewportClass = await getViewportClass(page)

  if (viewportClass === 'desktop') {
    await page.getByTestId('theme-toggle').click()
    return
  }

  await page.getByRole('button', { name: 'Toggle Menu' }).click()
  const drawer = page.getByRole('dialog')
  await expect(drawer).toBeVisible()
  await drawer.getByTestId('mobile-theme-toggle').click()
}

export async function expectPublicPageSizeParam(page: Page, expectedPageSize: number) {
  await expect.poll(() => new URL(page.url()).searchParams.get('pageSize')).toBe(String(expectedPageSize))
}
