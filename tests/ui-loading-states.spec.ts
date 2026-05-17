import { expect, test } from './helpers/performance-test'
import { clickHeaderNavLink, rewriteHeaderNavHref } from './helpers/navigation'

test('WQ-024 and VA-403 public route transitions expose loading feedback or complete cleanly', async ({ page }) => {
  await page.goto('/blog')
  await rewriteHeaderNavHref(page, 'Home', `/?__qaSlow=1&__qaRun=${Date.now()}`)
  await clickHeaderNavLink(page, 'Home')

  const skeleton = page.locator('.animate-pulse').first()
  const heading = page.getByRole('heading', { name: 'Works', exact: true })
  await Promise.race([
    skeleton.waitFor({ state: 'visible', timeout: 1500 }).catch(() => undefined),
    heading.waitFor({ state: 'visible', timeout: 1500 }).catch(() => undefined),
  ])
  await expect(heading).toBeVisible()
})

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('WQ-024 admin dashboard transitions expose loading chrome before the dashboard resolves', async ({ page }) => {
  await page.goto('/admin/blog')

  const dashboardLink = page.locator('aside nav').getByRole('link', { name: 'Dashboard' })
  await dashboardLink.evaluate((element) => {
    ;(element as HTMLAnchorElement).href = '/admin/dashboard?__qaSlow=1'
  })
  await dashboardLink.click()

  const skeleton = page.locator('.animate-pulse').first()
  const heading = page.getByRole('heading', { name: 'Dashboard', exact: true })
  await Promise.race([
    skeleton.waitFor({ state: 'visible', timeout: 1500 }).catch(() => undefined),
    heading.waitFor({ state: 'visible', timeout: 1500 }).catch(() => undefined),
  ])
  await expect(heading).toBeVisible()
})
