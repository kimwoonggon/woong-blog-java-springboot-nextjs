import { expect, type Page } from '@playwright/test'

export async function clickHeaderNavLink(page: Page, label: string) {
  const inlineLink = page.locator('header nav a').filter({ hasText: new RegExp(`^${label}$`) }).first()
  const menuButton = page.locator('header button').filter({ has: page.locator('svg.lucide-menu') }).first()
  const dialogLink = page.getByRole('dialog').getByRole('link', { name: label, exact: true })

  await expect.poll(async () => {
    if (await inlineLink.isVisible().catch(() => false)) return 'inline'
    if (await dialogLink.isVisible().catch(() => false)) return 'dialog'
    if (await menuButton.isVisible().catch(() => false)) return 'menu'
    return 'none'
  }).not.toBe('none')

  if (await inlineLink.isVisible().catch(() => false)) {
    await inlineLink.click()
    return
  }

  if (await dialogLink.isVisible().catch(() => false)) {
    await dialogLink.click()
    return
  }

  await expect(menuButton).toBeVisible()
  await menuButton.click()
  await page.getByRole('dialog').getByRole('link', { name: label, exact: true }).click()
}

export async function rewriteHeaderNavHref(page: Page, label: string, href: string) {
  const inlineLink = page.locator('header nav a').filter({ hasText: new RegExp(`^${label}$`) }).first()
  const menuButton = page.locator('header button').filter({ has: page.locator('svg.lucide-menu') }).first()
  const dialogLink = page.getByRole('dialog').getByRole('link', { name: label, exact: true })

  await expect.poll(async () => {
    if (await inlineLink.isVisible().catch(() => false)) return 'inline'
    if (await dialogLink.isVisible().catch(() => false)) return 'dialog'
    if (await menuButton.isVisible().catch(() => false)) return 'menu'
    return 'none'
  }).not.toBe('none')

  if (await inlineLink.isVisible().catch(() => false)) {
    await inlineLink.evaluate((element, nextHref) => {
      ;(element as HTMLAnchorElement).href = nextHref
    }, href)
    return
  }

  if (!(await dialogLink.isVisible().catch(() => false))) {
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    await expect(dialogLink).toBeVisible()
  }

  await dialogLink.evaluate((element, nextHref) => {
    ;(element as HTMLAnchorElement).href = nextHref
  }, href)
}
