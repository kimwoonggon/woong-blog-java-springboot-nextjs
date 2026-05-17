import { expect, test } from './helpers/performance-test'
import { measureStep } from './helpers/latency'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })


test('site settings persist mixed special-character owner and tagline values', async ({ page }, testInfo) => {
  const ownerName = `홍길동! QA ${Date.now()} ###`
  const tagline = `Full-stack / AI / 한국어 / !!! ${Date.now()}`

  page.on('dialog', (dialog) => {
    void dialog.accept().catch(() => {})
  })

  await page.goto('/admin/pages')
  await page.locator('#ownerName').fill(ownerName)
  await page.locator('#tagline').fill(tagline)

  await measureStep(
    testInfo,
    'Admin site settings extreme input save to public home refresh',
    'adminMutationPublicRefresh',
    async () => {
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/admin/site-settings') && res.request().method() === 'PUT' && res.ok()),
        page.waitForResponse((res) => res.url().includes('/revalidate-public') && res.request().method() === 'POST' && res.ok()),
        page.getByRole('button', { name: 'Save Changes' }).first().click(),
      ])
    },
    async () => {
      await page.goto('/')
      await expect(page.getByRole('link', { name: ownerName }).first()).toBeVisible()
      await expect(page).toHaveTitle(
        new RegExp(
          `${ownerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*${tagline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
          'i'
        )
      )
    },
  )
})
