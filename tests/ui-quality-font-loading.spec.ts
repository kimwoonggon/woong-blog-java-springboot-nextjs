import { expect, test } from './helpers/performance-test'

test('WQ-025 root layout loads Next fonts with swap display behavior', async ({ page, request }) => {
  await page.goto('/')

  const cssLinks = await page.locator('link[rel="preload"][as="style"], link[rel="stylesheet"]').evaluateAll((links) =>
    links
      .map((link) => link.getAttribute('href'))
      .filter((href): href is string => typeof href === 'string' && href.startsWith('/_next/static/')),
  )

  expect(cssLinks.length).toBeGreaterThan(0)

  const cssResponses = await Promise.all(
    cssLinks.slice(0, 4).map((href) => request.get(href)),
  )

  const cssText = (await Promise.all(cssResponses.map((response) => response.text()))).join('\n')
  expect(cssText).toMatch(/font-display:\s*swap/)
})
