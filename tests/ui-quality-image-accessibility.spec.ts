import { expect, test } from './helpers/performance-test'
import { isLocalQaBaseUrl, LOCAL_QA_FLAG_SKIP_REASON } from './helpers/local-qa'

test('WQ-003 meaningful public images expose descriptive alt text', async ({ page }) => {
  await page.goto('/')

  const heroImage = page.locator('main img').first()
  await expect(heroImage).toBeVisible()
  await expect(heroImage).not.toHaveAttribute('alt', /^Profile$/)
  await expect.poll(() => heroImage.getAttribute('alt')).toBeTruthy()

  const featuredCard = page.getByTestId('featured-work-card').first()
  await expect(featuredCard).toBeVisible()
  const featuredTitle = (await featuredCard.locator('h3').innerText()).trim()
  const featuredImage = featuredCard.locator('img').first()
  const featuredPlaceholder = featuredCard.getByTestId('featured-work-no-image-placeholder')

  if (await featuredImage.count()) {
    await expect(featuredImage).toBeVisible()
    await expect(featuredImage).toHaveAttribute('alt', featuredTitle)
    return
  }

  await expect(featuredPlaceholder).toBeVisible()
  await expect(featuredPlaceholder).toContainText('No Image')
})

test('WQ-003 work listing images and no-image placeholders stay understandable', async ({ page }) => {
  test.skip(!isLocalQaBaseUrl(), LOCAL_QA_FLAG_SKIP_REASON)

  await page.goto('/works?__qaNoImage=1')

  const placeholders = page.getByTestId('work-card-no-image-placeholder')
  await expect(placeholders.first()).toBeVisible()
  await expect(placeholders.first()).toContainText('No Image')

  await page.goto('/works')
  const firstCard = page.getByTestId('work-card').first()
  await expect(firstCard).toBeVisible()

  const image = firstCard.locator('img').first()
  if (await image.count()) {
    const heading = (await firstCard.locator('h2').innerText()).trim()
    await expect(image).toHaveAttribute('alt', heading)
  }
})
