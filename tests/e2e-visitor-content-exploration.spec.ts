import { expect, test } from './helpers/performance-test'
import { clickHeaderNavLink } from './helpers/navigation'

test('E2E-003 visitor can move from home to works, through related content, and into blog details', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Works', exact: true })).toBeVisible()
  await clickHeaderNavLink(page, 'Works')
  await expect(page).toHaveURL(/\/works(?:\?.*)?$/)

  const firstWorkCard = page.getByTestId('work-card').first()
  await expect(firstWorkCard).toBeVisible()
  const firstWorkTitle = (await firstWorkCard.locator('h2').innerText()).trim()
  await firstWorkCard.click()

  await expect(page.getByTestId('work-detail-title')).toHaveText(firstWorkTitle)
  await expect(page.getByTestId('work-related-shell')).toBeVisible()

  const relatedWorkCard = page.getByTestId('related-work-card').first()
  await expect(relatedWorkCard).toBeVisible()
  await relatedWorkCard.click()

  await expect(page.getByTestId('work-detail-title')).toBeVisible()
  await expect(page).toHaveURL(/\/works\/.+/)

  await clickHeaderNavLink(page, 'Study')
  await expect(page).toHaveURL(/\/blog(?:\?.*)?$/)

  const firstBlogCard = page.getByTestId('blog-card').first()
  await expect(firstBlogCard).toBeVisible()
  const firstBlogTitle = (await firstBlogCard.locator('[data-slot="card-title"]').innerText()).trim()
  const firstBlogHref = await firstBlogCard.getAttribute('href')
  expect(firstBlogHref).toBeTruthy()
  await firstBlogCard.click()

  await expect(page).toHaveURL(new RegExp(`/blog/.+`))
  await expect(page.getByTestId('blog-detail-title')).toHaveText(firstBlogTitle)
  await expect(page.getByTestId('blog-related-shell')).toBeVisible()
  await expect(page.getByTestId('blog-prev-next')).toBeVisible()
})
