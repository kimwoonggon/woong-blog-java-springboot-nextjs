import { expect, test } from './helpers/performance-test'

test('home featured works no longer uses the generic click to view details fallback copy', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Click to view details')).toHaveCount(0)
})
