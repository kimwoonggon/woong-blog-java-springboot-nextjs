import { expect, test, type Locator } from './helpers/performance-test'

async function measureLineLength(locator: Locator) {
  return locator.evaluate((element: HTMLElement) => {
    const clone = document.createElement('span')
    const style = getComputedStyle(element)
    clone.textContent = '0'
    clone.style.position = 'absolute'
    clone.style.visibility = 'hidden'
    clone.style.whiteSpace = 'pre'
    clone.style.font = style.font
    clone.style.letterSpacing = style.letterSpacing
    clone.style.textTransform = style.textTransform
    document.body.appendChild(clone)
    const chWidth = clone.getBoundingClientRect().width
    clone.remove()
    const width = element.getBoundingClientRect().width
    return width / chWidth
  })
}

test('VA-011 long-form public prose keeps body lines within a readable character width', async ({ page }) => {
  await page.goto('/blog/seeded-blog')

  const paragraph = page.locator('#blog-detail-content .prose p').filter({ hasText: /\S/ }).first()
  await expect(paragraph).toBeVisible()
  const blogChars = await measureLineLength(paragraph)
  expect(blogChars).toBeLessThanOrEqual(75)

  await page.goto('/works/seeded-work')
  const workParagraph = page.locator('#work-detail-content .prose p').filter({ hasText: /\S/ }).first()
  await expect(workParagraph).toBeVisible()
  const workChars = await measureLineLength(workParagraph)
  expect(workChars).toBeLessThanOrEqual(75)
})
