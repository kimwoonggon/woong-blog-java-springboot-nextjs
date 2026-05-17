import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page } from './helpers/performance-test'

const captureDir = path.join('test-results', 'playwright', 'regression-captures')

async function saveShot(page: Page, fileName: string) {
  await mkdir(captureDir, { recursive: true })
  await page.screenshot({ path: path.join(captureDir, fileName), fullPage: true })
}

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('captures AI dialog, batch panel, and work media states', async ({ page }) => {
  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(`Screenshot Capture ${Date.now()}`)
  await page.locator('form .tiptap.ProseMirror').first().click()
  await page.keyboard.type('capture the ai dialog state')
  await page.getByRole('button', { name: 'AI Content Fixer' }).click()
  await expect(page.getByRole('heading', { name: 'AI Content Fixer' })).toBeVisible()
  await saveShot(page, 'admin-ai-fix-dialog.png')
  await page.getByRole('button', { name: 'Cancel' }).click()

  await page.goto('/admin/blog')
  const rows = page.getByTestId('admin-blog-row')
  await expect(rows.first()).toBeVisible()
  if (await rows.count() > 1) {
    await rows.nth(0).getByRole('checkbox').click()
    await rows.nth(1).getByRole('checkbox').click()
  } else {
    await rows.nth(0).getByRole('checkbox').click()
  }
  await page.getByRole('button', { name: 'Batch AI Fix' }).click()
  await expect(page.getByTestId('admin-blog-batch-ai-panel')).toBeVisible()
  await saveShot(page, 'admin-blog-batch-panel.png')

  await page.goto('/admin/works/new')
  await page.getByRole('tab', { name: 'Media & Videos' }).click()
  await expect(page.getByLabel('YouTube URL or ID')).toBeVisible()
  await saveShot(page, 'admin-work-media-tab.png')
})
