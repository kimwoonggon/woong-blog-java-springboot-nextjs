import { expect, test } from './helpers/performance-test'
import { isLocalQaBaseUrl, LOCAL_QA_FLAG_SKIP_REASON } from './helpers/local-qa'

test('works cards use the richer no-image placeholder treatment', async ({ page }) => {
  test.skip(!isLocalQaBaseUrl(), LOCAL_QA_FLAG_SKIP_REASON)

  await page.goto('/works?__qaNoImage=1')

  const placeholder = page.getByTestId('work-card-no-image-placeholder').first()
  await expect(placeholder).toBeVisible()
  await expect(placeholder).toHaveClass(/bg-gradient-to-br/)
})
