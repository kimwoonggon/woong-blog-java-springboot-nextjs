import path from 'path'
import { expect, test } from './helpers/performance-test'
import { measureStep } from './helpers/latency'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('admin can upload a resume pdf and public resume page exposes download', async ({ page }, testInfo) => {
  page.on('dialog', (dialog) => {
    void dialog.accept().catch(() => {})
  })

  await page.goto('/admin/pages')
  const resumeSection = page.locator('#resume-editor')
  await expect(resumeSection.getByText('Resume Management')).toBeVisible()

  if (await resumeSection.getByText('Resume PDF Uploaded').isVisible()) {
    await resumeSection.locator('button:has(svg.lucide-trash-2)').click()
    await expect(resumeSection.getByText('No resume uploaded yet.')).toBeVisible()
  }

  const fileInput = resumeSection.locator('#resume-upload')
  await measureStep(
    testInfo,
    'Admin resume upload to public resume refresh',
    'adminMutationPublicRefresh',
    async () => {
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/uploads') && res.request().method() === 'POST' && res.ok()),
        page.waitForResponse((res) => res.url().includes('/api/admin/site-settings') && res.request().method() === 'PUT' && res.ok()),
        page.waitForResponse((res) => res.url().includes('/revalidate-public') && res.request().method() === 'POST' && res.ok()),
        fileInput.setInputFiles(path.resolve('tests/fixtures/resume.pdf')),
      ])
    },
    async () => {
      await expect(resumeSection.getByText('Resume PDF Uploaded')).toBeVisible({ timeout: 20000 })
      await page.goto('/resume')
      const downloadLink = page.getByRole('link', { name: /download/i }).first()
      await expect(downloadLink).toBeVisible()
      await expect(downloadLink).toHaveAttribute('href', /\/media\/public-resume\//)
    },
  )

  const downloadLink = page.getByRole('link', { name: /download/i }).first()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    downloadLink.click(),
  ])
  expect(await download.suggestedFilename()).toMatch(/\.pdf$/i)
})

test('admin can delete the uploaded resume and clear the public resume page', async ({ page }, testInfo) => {
  page.on('dialog', (dialog) => {
    void dialog.accept().catch(() => {})
  })

  await page.goto('/admin/pages')
  const resumeSection = page.locator('#resume-editor')
  await expect(resumeSection.getByText('Resume Management')).toBeVisible()

  if (!(await resumeSection.getByText('Resume PDF Uploaded').isVisible())) {
    const fileInput = resumeSection.locator('#resume-upload')
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/uploads') && res.request().method() === 'POST' && res.ok()),
      fileInput.setInputFiles(path.resolve('tests/fixtures/resume.pdf')),
    ])
    await expect(resumeSection.getByText('Resume PDF Uploaded')).toBeVisible({ timeout: 20000 })
  }

  await measureStep(
    testInfo,
    'Admin resume delete to public resume refresh',
    'adminMutationPublicRefresh',
    async () => {
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/admin/site-settings') && res.request().method() === 'PUT' && res.ok()),
        page.waitForResponse((res) => res.url().includes('/api/uploads') && res.request().method() === 'DELETE'),
        page.waitForResponse((res) => res.url().includes('/revalidate-public') && res.request().method() === 'POST' && res.ok()),
        resumeSection.getByRole('button', { name: 'Delete resume' }).click(),
      ])
    },
    async () => {
      await expect(resumeSection.getByText('No resume uploaded yet.')).toBeVisible({ timeout: 20000 })
      await page.goto('/resume')
      await expect(page.locator('main')).toContainText('Resume unavailable', { timeout: 20000 })
      await expect(page.locator('main')).toContainText('No resume has been published yet.', { timeout: 20000 })
      await expect(page.getByRole('link', { name: /download/i })).toHaveCount(0)
    },
  )

  await page.goto('/admin/pages')
  await expect(page.locator('#resume-editor').getByText('No resume uploaded yet.')).toBeVisible()
})
