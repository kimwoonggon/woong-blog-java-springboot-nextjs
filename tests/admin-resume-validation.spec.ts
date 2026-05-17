import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })
import path from 'path'

test('resume editor rejects non-pdf uploads and stays on admin page', async ({ page }) => {
  page.on('dialog', (dialog) => {
    void dialog.accept().catch(() => {})
  })

  await page.goto('/admin/pages')
  await expect(page).toHaveURL(/\/admin\/pages/)
  const resumeSection = page.locator('#resume-editor')
  await expect(resumeSection.getByText('Resume Management')).toBeVisible()

  const removeButton = resumeSection.locator('button:has(svg.lucide-trash-2)')
  if (await resumeSection.getByText('Resume PDF Uploaded').isVisible()) {
    await removeButton.click()
    await expect(resumeSection.getByText('No resume uploaded yet.')).toBeVisible()
  }

  const fileInput = resumeSection.locator('#resume-upload')
  await fileInput.setInputFiles(path.resolve('tests/fixtures/not-a-pdf.txt'))

  await expect(page.getByText('Please upload a PDF file.')).toBeVisible()
  await expect(resumeSection.getByText('No resume uploaded yet.')).toBeVisible()
})
