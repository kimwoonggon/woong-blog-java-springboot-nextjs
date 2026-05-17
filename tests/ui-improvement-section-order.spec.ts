import { expect, test } from './helpers/performance-test'
import { expectRgbClose, getColorChannels, getRootVariableChannels } from './helpers/ui-improvement'

test('Works appears before Study Notes on the home page', async ({ page }) => {
  await page.goto('/')

  const featuredHeading = page.getByRole('heading', { name: 'Works', exact: true })
  const recentHeading = page.getByRole('heading', { name: 'Study Notes' })

  const featuredBox = await featuredHeading.boundingBox()
  const recentBox = await recentHeading.boundingBox()

  expect(featuredBox).toBeTruthy()
  expect(recentBox).toBeTruthy()
  expect(featuredBox!.y).toBeLessThan(recentBox!.y)
})

test('Works section uses the brand section background', async ({ page }) => {
  await page.goto('/')

  const section = page.getByRole('heading', { name: 'Works', exact: true }).locator('xpath=ancestor::section[1]')
  const background = await getColorChannels(section, 'background-color')
  const expected = await getRootVariableChannels(page, '--brand-section-bg')
  expectRgbClose(background, expected)
})
