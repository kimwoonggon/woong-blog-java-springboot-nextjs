import { expect, test } from './helpers/performance-test'

test('blog detail prev-next keeps relatedPage in the url', async ({ page }) => {
  await page.goto('/blog/seeded-blog?relatedPage=5')

  const nav = page.getByTestId('blog-prev-next')
  await expect(nav).toBeVisible()

  const nextOrPrev = nav.getByRole('link').first()
  await expect(nextOrPrev).toHaveAttribute('href', /relatedPage=5/)
})

test('work detail prev-next keeps relatedPage in the url', async ({ page }) => {
  await page.goto('/works/seeded-work?relatedPage=5')

  const nav = page.getByTestId('work-prev-next')
  await expect(nav).toBeVisible()

  const nextOrPrev = nav.getByRole('link').first()
  await expect(nextOrPrev).toHaveAttribute('href', /relatedPage=5/)
})
