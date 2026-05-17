import { expect, test, type Page } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

async function saveSiteSettings(page: Page) {
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/admin/site-settings') && response.request().method() === 'PUT' && response.ok()),
    page.waitForResponse((response) => response.url().includes('/revalidate-public') && response.request().method() === 'POST' && response.ok()),
    page.getByRole('button', { name: 'Save Changes' }).first().click(),
  ])
}

test('PF-084 footer renders only the configured social icons', async ({ page }) => {
  const instagramInput = page.locator('#instagramUrl')
  const twitterInput = page.locator('#twitterUrl')
  const linkedinInput = page.locator('#linkedinUrl')
  const githubInput = page.locator('#githubUrl')

  await page.goto('/admin/pages')

  const originalInstagram = await instagramInput.inputValue()
  const originalTwitter = await twitterInput.inputValue()
  const originalLinkedIn = await linkedinInput.inputValue()
  const originalGitHub = await githubInput.inputValue()

  try {
    await instagramInput.fill('https://instagram.com/footer-qa')
    await twitterInput.fill('')
    await linkedinInput.fill('https://linkedin.com/in/footer-qa')
    await githubInput.fill('')
    await saveSiteSettings(page)

    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/footer-qa')
    await expect(footer.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/in/footer-qa')
    await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveCount(0)

    await page.goto('/admin/pages')
    await instagramInput.fill('')
    await twitterInput.fill('')
    await linkedinInput.fill('')
    await githubInput.fill('')
    await saveSiteSettings(page)

    await page.goto('/')
    await expect(page.locator('footer')).not.toContainText('Elsewhere')
    await expect(page.locator('footer').getByRole('link', { name: 'Instagram' })).toHaveCount(0)
    await expect(page.locator('footer').getByRole('link', { name: 'LinkedIn' })).toHaveCount(0)
    await expect(page.locator('footer').getByRole('link', { name: 'GitHub' })).toHaveCount(0)
  } finally {
    await page.goto('/admin/pages')
    await instagramInput.fill(originalInstagram)
    await twitterInput.fill(originalTwitter)
    await linkedinInput.fill(originalLinkedIn)
    await githubInput.fill(originalGitHub)
    await saveSiteSettings(page)
  }
})
