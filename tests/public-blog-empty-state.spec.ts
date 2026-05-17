import { expect, test } from './helpers/performance-test'
import { isLocalQaBaseUrl, LOCAL_QA_FLAG_SKIP_REASON } from './helpers/local-qa'

test('PF-014 shows an empty-state message when no blog posts are available', async ({ page }) => {
  test.skip(!isLocalQaBaseUrl(), LOCAL_QA_FLAG_SKIP_REASON)

  await page.goto('/blog?__qaEmpty=1')

  await expect(page.getByRole('heading', { name: 'Study', exact: true })).toBeVisible()
  await expect(page.getByTestId('blog-card')).toHaveCount(0)
  await expect(page.locator('main')).toContainText('No blog posts found.')
  await expect(page.getByLabel('Study pagination')).toBeVisible()
  await expect(page.getByLabel('Study pagination').getByText('1 / 1')).toBeVisible()
})
