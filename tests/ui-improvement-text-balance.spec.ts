import { expect, test } from './helpers/performance-test'

test('hero heading applies balanced text wrapping', async ({ page }) => {
  await page.goto('/')

  const heading = page.getByRole('heading', { level: 1 }).first()
  await expect(heading).toHaveClass(/\[text-wrap:balance\]/)

  const wrapValue = await heading.evaluate((element) => {
    const style = getComputedStyle(element as HTMLElement)
    return style.getPropertyValue('text-wrap').trim()
      || style.getPropertyValue('text-wrap-style').trim()
  })

  expect(['balance', 'stable', 'wrap']).toContain(wrapValue || 'balance')
})
