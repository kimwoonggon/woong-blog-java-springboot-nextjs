import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })


test('home page editor persists mixed Korean, English, and punctuation input', async ({ page }) => {
  const headline = `안녕! Extreme Home ${Date.now()} !!!`
  const introText = `영어 English / 한국어 / !!! / ??? / () [] {} / edge ${Date.now()}`

  page.on('dialog', (dialog) => {
    void dialog.accept().catch(() => {})
  })

  await page.goto('/admin/pages')
  const homeEditor = page.getByRole('heading', { name: 'Home Page - Hero Section' }).locator('xpath=ancestor::div[contains(@class, "space-y-6")][1]')
  await homeEditor.getByLabel('Headline').fill(headline)
  await homeEditor.getByLabel('Intro Text').fill(introText)
  await expect(homeEditor.getByLabel('Headline')).toHaveValue(headline)
  await expect(homeEditor.getByLabel('Intro Text')).toHaveValue(introText)

  await Promise.all([
    page.waitForResponse((res) =>
      res.url().includes('/api/admin/pages')
      && res.request().method() === 'PUT'
      && res.ok(),
    ),
    homeEditor.getByRole('button', { name: 'Save Changes' }).click(),
  ])

  await page.goto('/admin/pages')
  await expect.poll(async () => {
    await page.reload({ waitUntil: 'domcontentloaded' })
    const refreshedEditor = page.getByRole('heading', { name: 'Home Page - Hero Section' })
      .locator('xpath=ancestor::div[contains(@class, "space-y-6")][1]')
    const refreshedHeadline = await refreshedEditor.getByLabel('Headline').inputValue()
    const refreshedIntro = await refreshedEditor.getByLabel('Intro Text').inputValue()
    return refreshedHeadline === headline && refreshedIntro === introText
  }, { timeout: 30_000 }).toBe(true)

  await page.goto('/')
  await expect.poll(async () => {
    await page.reload({ waitUntil: 'domcontentloaded' })
    const headingText = await page.getByRole('heading').first().textContent()
    const mainText = await page.locator('main').textContent()
    return (headingText?.includes(headline) ?? false) && (mainText?.includes(introText) ?? false)
  }, { timeout: 30_000 }).toBe(true)
})
