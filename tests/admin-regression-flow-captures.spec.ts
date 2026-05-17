import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page } from './helpers/performance-test'

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const captureDir = path.join('test-results', `regression-flow-captures-${stamp}`)

async function saveShot(page: Page, name: string) {
  await mkdir(captureDir, { recursive: true })
  await page.screenshot({ path: path.join(captureDir, name), fullPage: true })
}

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('captures before, during, and after states for AI fixer and thumbnail fallback flows', async ({ page }) => {
  await page.route('**/api/admin/ai/runtime-config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'codex',
        availableProviders: ['openai', 'codex'],
        defaultModel: 'gpt-5.4',
        codexModel: 'gpt-5.4',
        codexReasoningEffort: 'medium',
        allowedCodexModels: ['gpt-5.4', 'gpt-5.4-mini'],
        allowedCodexReasoningEfforts: ['low', 'medium', 'high'],
        batchConcurrency: 2,
        batchCompletedRetentionDays: 7,
      }),
    })
  })

  await page.route('**/api/admin/ai/blog-fix', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fixedHtml: '<h2>AI polished body</h2><p>Applied from mocked AI response.</p>',
      }),
    })
  })

  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(`Capture Flow ${Date.now()}`)
  await page.locator('form .tiptap.ProseMirror').first().fill('rough draft before ai fix')
  await saveShot(page, 'ai-fixer-before-open.png')

  await page.getByRole('button', { name: 'AI Content Fixer' }).click()
  await expect(page.getByRole('heading', { name: 'AI Content Fixer' })).toBeVisible()
  await saveShot(page, 'ai-fixer-open-ready.png')

  await page.getByRole('button', { name: 'Start AI Fix' }).click()
  await expect(page.getByText('Analyzing and fixing content...')).toBeVisible()
  await saveShot(page, 'ai-fixer-processing.png')

  await expect(page.getByText('AI polished body')).toBeVisible()
  await saveShot(page, 'ai-fixer-finished.png')

  await page.getByRole('button', { name: 'Apply Changes' }).click()
  await expect(page.locator('form .tiptap.ProseMirror').first()).toContainText('AI polished body')
  await saveShot(page, 'ai-fixer-applied.png')

  await page.goto('/admin/works/new')
  const title = `Thumbnail Capture ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await page.locator('.tiptap.ProseMirror').first().fill('thumbnail delete fallback flow')
  await page.getByLabel('YouTube URL or ID').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add YouTube Video' }).click()
  await page.getByRole('button', { name: 'Create with Videos' }).click()

  await expect(page.getByTestId('work-thumbnail-source')).toContainText(/manual|YouTube/)
  await saveShot(page, 'thumbnail-before-delete.png')

  await page.getByRole('button', { name: 'Remove Thumbnail' }).click()
  await expect(page.getByTestId('work-thumbnail-source')).toContainText(/YouTube|manual/)
  await expect(page.getByAltText('Work thumbnail preview')).toBeVisible()
  await saveShot(page, 'thumbnail-after-delete-regenerated.png')
})
