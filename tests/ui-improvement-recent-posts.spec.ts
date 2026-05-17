import { expect, test } from './helpers/performance-test'
import { getStyle } from './helpers/ui-improvement'

test('Study Notes section uses the default page background', async ({ page }) => {
  await page.goto('/')

  const section = page.getByRole('heading', { name: 'Study Notes' }).locator('xpath=ancestor::section[1]')
  const sectionBackground = await getStyle(section, 'background-color')
  const bodyBackground = await getStyle(page.locator('body'), 'background-color')

  expect(sectionBackground).toBe(bodyBackground)
})

test('Study Notes heading uses bold weight', async ({ page }) => {
  await page.goto('/')

  const heading = page.getByRole('heading', { name: 'Study Notes' })
  const fontWeight = await getStyle(heading, 'font-weight')
  expect(Number.parseInt(fontWeight, 10)).toBeGreaterThanOrEqual(700)
})

test('Study Notes removes template eyebrow and descriptive copy', async ({ page }) => {
  await page.goto('/')

  const section = page.getByTestId('recent-posts-section')
  await expect(section.getByRole('heading', { name: 'Study Notes' })).toBeVisible()
  await expect(section.getByText('Notes and essays', { exact: true })).toHaveCount(0)
  await expect(section.getByText(/Writing about product decisions/i)).toHaveCount(0)
})

test('Study Notes section keeps compact spacing after copy cleanup', async ({ page }) => {
  await page.goto('/')

  const section = page.getByTestId('recent-posts-section')
  const heading = section.getByRole('heading', { name: 'Study Notes' })

  await expect(section).toBeVisible()
  await section.scrollIntoViewIfNeeded()
  await expect(heading).toBeVisible()

  const [sectionBox, headingBox] = await Promise.all([
    section.boundingBox(),
    heading.boundingBox(),
  ])

  expect(sectionBox).toBeTruthy()
  expect(headingBox).toBeTruthy()
  expect(headingBox!.y - sectionBox!.y).toBeLessThanOrEqual(48)
})
