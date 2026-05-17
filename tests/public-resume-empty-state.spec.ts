import { expect, test } from './helpers/performance-test'
import { isLocalQaBaseUrl, LOCAL_QA_FLAG_SKIP_REASON } from './helpers/local-qa'

test('PF-072 shows the no-resume message when no resume PDF is configured', async ({ page }) => {
  test.skip(!isLocalQaBaseUrl(), LOCAL_QA_FLAG_SKIP_REASON)

  const response = await page.goto('/resume?__qaEmpty=1')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { name: 'Resume', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Download PDF/i })).toHaveCount(0)
  await expect(page.locator('[data-testid="resume-shell"]')).toContainText('Resume unavailable')
  await expect(page.locator('[data-testid="resume-shell"]')).toContainText('No resume has been published yet.')
})
