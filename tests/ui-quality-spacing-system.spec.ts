import { expect, test } from './helpers/performance-test'

function isMultipleOfFour(value: number) {
  return Math.abs(value - Math.round(value / 4) * 4) < 0.1
}

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('VA-020 key layout paddings and gaps follow the 4px spacing rhythm', async ({ page }) => {
  await page.goto('/')

  const homeSamples = await Promise.all([
    page.locator('main > div').first().evaluate((element: HTMLElement) => ({ name: 'home main row gap', value: getComputedStyle(element).rowGap })),
    page.getByTestId('featured-works-section').evaluate((element: HTMLElement) => ({ name: 'featured works padding top', value: getComputedStyle(element).paddingTop })),
    page.getByTestId('recent-posts-section').evaluate((element: HTMLElement) => ({ name: 'recent posts padding left', value: getComputedStyle(element).paddingLeft })),
    page.locator('footer nav[aria-label="Footer navigation"]').evaluate((element: HTMLElement) => ({ name: 'footer nav column gap', value: getComputedStyle(element).columnGap })),
  ])

  await page.goto('/admin/blog')

  const adminSamples = await Promise.all([
    page.locator('main').first().evaluate((element: HTMLElement) => ({ name: 'admin main padding top', value: getComputedStyle(element).paddingTop })),
    page.locator('aside').first().evaluate((element: HTMLElement) => ({ name: 'admin aside padding left', value: getComputedStyle(element).paddingLeft })),
  ])

  for (const sample of [...homeSamples, ...adminSamples]) {
    const value = Number.parseFloat(sample.value)
    expect(isMultipleOfFour(value), `${sample.name}: ${sample.value}`).toBe(true)
  }
})
