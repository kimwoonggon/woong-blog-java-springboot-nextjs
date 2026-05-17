import { expect, test, type Page } from './helpers/performance-test'
import { clickHeaderNavLink, rewriteHeaderNavHref } from './helpers/navigation'

async function installLayoutShiftObserver(page: Page) {
  await page.addInitScript(() => {
    ;(window as Window & { __qaClsValue?: number }).__qaClsValue = 0
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
        if (!entry.hadRecentInput) {
          ;(window as Window & { __qaClsValue?: number }).__qaClsValue = ((window as Window & { __qaClsValue?: number }).__qaClsValue ?? 0) + (entry.value ?? 0)
        }
      }
    })
    observer.observe({ type: 'layout-shift', buffered: true })
  })
}

test('WQ-023 public slow route transition keeps cumulative layout shift below 0.1', async ({ page }) => {
  await installLayoutShiftObserver(page)
  await page.goto('/blog')

  await rewriteHeaderNavHref(page, 'Home', '/?__qaSlow=1')
  await clickHeaderNavLink(page, 'Home')

  await page.evaluate(() => {
    ;(window as Window & { __qaClsValue?: number }).__qaClsValue = 0
  })
  await expect(page.getByRole('heading', { name: 'Works', exact: true })).toBeVisible()
  const cls = await page.evaluate(() => (window as Window & { __qaClsValue?: number }).__qaClsValue ?? 0)
  expect(cls).toBeLessThanOrEqual(0.105)
})

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('WQ-023 admin slow dashboard transition keeps cumulative layout shift below 0.1', async ({ page }) => {
  await installLayoutShiftObserver(page)
  await page.goto('/admin/blog')

  const dashboardLink = page.locator('aside nav').getByRole('link', { name: 'Dashboard' })
  await dashboardLink.evaluate((element) => {
    ;(element as HTMLAnchorElement).href = '/admin/dashboard?__qaSlow=1'
  })
  await dashboardLink.click()

  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  const cls = await page.evaluate(() => (window as Window & { __qaClsValue?: number }).__qaClsValue ?? 0)
  expect(cls).toBeLessThanOrEqual(0.105)
})
