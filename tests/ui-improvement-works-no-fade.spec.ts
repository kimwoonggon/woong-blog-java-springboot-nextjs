import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'

test('works heading renders immediately without the hero fade-in animation', async ({ page }) => {
  await page.goto('/works')

  const heading = page.getByRole('heading', { name: 'Works', exact: true })
  await expect(heading).toBeVisible()
  await expect.poll(() => getStyle(heading, 'opacity')).toBe('1')

  const className = await heading.evaluate((element) => element.className)
  expect(className).not.toContain('animate-fade-in-up')
})
