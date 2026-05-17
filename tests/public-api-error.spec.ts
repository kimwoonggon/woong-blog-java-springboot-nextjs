import { expect, test } from './helpers/performance-test'
import { isLocalQaBaseUrl, LOCAL_QA_FLAG_SKIP_REASON } from './helpers/local-qa'

test('CF-005 shows a user-facing fallback when a public page payload is malformed', async ({ page }) => {
  test.skip(!isLocalQaBaseUrl(), LOCAL_QA_FLAG_SKIP_REASON)

  await page.goto('/introduction?__qaBroken=1')

  await expect(page.getByText('Public pages')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'This page could not be loaded.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
})
