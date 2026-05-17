import { expect, test } from './helpers/performance-test'
import { contrastRatio, getColorChannels, gotoWithTheme } from './helpers/ui-improvement'

test('dark mode muted text contrast is at least 4.5:1', async ({ page }) => {
  await gotoWithTheme(page, '/')

  const mutedText = page.getByRole('heading', { name: 'Study Notes' })
  await expect(mutedText).toBeVisible()

  const foreground = await getColorChannels(mutedText, 'color')
  const background = await getColorChannels(page.locator('body'), 'background-color')
  expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
})

test('dark mode secondary work metadata keeps accessible contrast', async ({ page }) => {
  await gotoWithTheme(page, '/works')

  const workCard = page.getByTestId('work-card').first()
  await expect(workCard).toBeVisible()
  const categoryText = workCard.locator('.uppercase').first()
  const cardSurface = workCard.locator('article').first()

  const foreground = await getColorChannels(categoryText, 'color')
  const background = await getColorChannels(cardSurface, 'background-color')
  expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
})
