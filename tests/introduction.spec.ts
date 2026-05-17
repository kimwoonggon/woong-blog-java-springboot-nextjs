import { expect, test } from './helpers/performance-test'

test('introduction page renders backend-managed content', async ({ page, request }) => {
  const response = await request.get('/api/public/pages/introduction')
  expect(response.ok()).toBeTruthy()

  const payload = await response.json()
  const contentJson = JSON.parse(payload.contentJson as string) as { html?: string }
  const expectedPlainText = (contentJson.html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  await page.goto('/introduction')

  const shell = page.getByTestId('static-public-shell')
  const prose = shell.locator('.prose').first()

  await expect(page.locator('main h1').first()).toHaveText(payload.title as string)
  await expect(shell.getByText('About the work')).toHaveCount(0)
  await expect(shell.getByText(/A short framing of who I am, what kind of problems I like to solve/i)).toHaveCount(0)
  await expect(prose).toBeVisible()
  await expect
    .poll(async () => ((await prose.innerText()).replace(/\s+/g, ' ').trim().length))
    .toBeGreaterThan(0)
  if (expectedPlainText) {
    const normalizedPageText = ((await prose.innerText()).replace(/\s+/g, ' ').trim())
    expect(normalizedPageText.length).toBeGreaterThan(0)
  }
  await page.screenshot({ path: 'test-results/playwright/introduction-page.png', fullPage: true })
})
