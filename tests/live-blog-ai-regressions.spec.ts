import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

const EVIDENCE_ROOT = process.env.PLAYWRIGHT_EVIDENCE_DIR || `test-results/playwright-deve2e-0414/live-captures-${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_')}`

async function ensureEvidenceDir() {
  await fs.mkdir(EVIDENCE_ROOT, { recursive: true })
  return EVIDENCE_ROOT
}

async function capture(page: Page, name: string) {
  const root = await ensureEvidenceDir()
  await page.screenshot({
    path: path.join(root, `${name}.png`),
    fullPage: true,
  })
}

async function setEditorHtml(page: Page, html: string) {
  await page.waitForFunction(() => {
    const target = window as typeof window & {
      __WOONG_TIPTAP_EDITOR__?: { commands?: { setContent?: (value: string) => void } }
    }
    return Boolean(target.__WOONG_TIPTAP_EDITOR__?.commands?.setContent)
  })

  await page.evaluate((nextHtml) => {
    const target = window as typeof window & {
      __WOONG_TIPTAP_EDITOR__?: { commands?: { setContent?: (value: string) => void } }
    }
    target.__WOONG_TIPTAP_EDITOR__?.commands?.setContent?.(nextHtml)
  }, html)
}

async function createBlogPost(page: Page, title: string, html: string) {
  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(title)
  await setEditorHtml(page, html)

  const [response] = await Promise.all([
    page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/blogs' && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: 'Create Post' }).click(),
  ])

  return await response.json() as { id: string; slug: string }
}

test.describe('live AI and inline blog regressions', () => {
  test.setTimeout(180_000)

  test('public blog detail save returns to the originating list page', async ({ page }) => {
    const title = `Return To Blog ${Date.now()}`
    const created = await createBlogPost(page, title, `<p>${title}</p>`)

    await page.goto(`/blog/${created.slug}?returnTo=%2Fblog%3Fpage%3D1%26pageSize%3D12&relatedPage=1`)
    await capture(page, 'blog-return-before-edit')

    await page.getByRole('button', { name: '글 수정' }).click()
    const editor = page.locator('.tiptap.ProseMirror').first()
    await expect(editor).toBeVisible()
    await editor.click()
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
    await page.keyboard.type(`${title} updated inline`)
    await capture(page, 'blog-return-editing')

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/blogs/') && res.request().method() === 'PUT' && res.ok()),
      page.getByRole('button', { name: 'Update Post' }).click(),
    ])

    await expect(page).toHaveURL(/\/blog\?page=1&pageSize=\d+/)
    await expect(page.getByText(title).first()).toBeVisible()
    await capture(page, 'blog-return-after-save')
  })

  test('blog AI fixer runs against the live codex backend and applies changes', async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_LIVE_AI !== '1', 'Live AI smoke requires PLAYWRIGHT_LIVE_AI=1.')
    const title = `Live Blog AI ${Date.now()}`
    const editorBody = '<h2>why bff works</h2><p>bff auth centralizes session ownership in the backend and keeps the browser thinner.</p>'

    await page.goto('/admin/blog/new')
    await page.getByLabel('Title').fill(title)
    await setEditorHtml(page, editorBody)

    await capture(page, 'blog-ai-before-open')
    await page.getByRole('button', { name: 'AI Content Fixer' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await capture(page, 'blog-ai-open')

    const providerSelect = dialog.getByLabel('AI provider')
    if (await providerSelect.count()) {
      await providerSelect.selectOption('codex')
    }

    const startButton = dialog.getByRole('button', { name: 'Start AI Fix' })
    await expect(startButton).toBeVisible()

    await Promise.all([
      page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/ai/blog-fix' && res.request().method() === 'POST' && res.ok(), { timeout: 120_000 }),
      startButton.click(),
    ])

    await capture(page, 'blog-ai-processing')
    const applyButton = dialog.getByRole('button', { name: 'Apply Changes' })
    await expect(applyButton).toBeVisible({ timeout: 120_000 })
    await capture(page, 'blog-ai-finished')

    await applyButton.click()
    await expect(dialog).toHaveCount(0)
    await capture(page, 'blog-ai-applied')
  })

  test('work AI enrich runs against the live codex backend and applies changes', async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_LIVE_AI !== '1', 'Live AI smoke requires PLAYWRIGHT_LIVE_AI=1.')
    const title = `Live Work AI ${Date.now()}`

    await page.goto('/admin/works/new')
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Category').fill('video')
    await page.locator('.tiptap.ProseMirror').first().fill('short work copy')

    await capture(page, 'work-ai-before-open')
    await page.getByRole('button', { name: 'AI Enrich' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await capture(page, 'work-ai-open')

    const providerSelect = dialog.getByLabel('AI provider')
    if (await providerSelect.count()) {
      await providerSelect.selectOption('codex')
    }

    const startButton = dialog.getByRole('button', { name: 'Start AI Fix' })
    await Promise.all([
      page.waitForResponse((res) => new URL(res.url()).pathname === '/api/admin/ai/work-enrich' && res.request().method() === 'POST' && res.ok(), { timeout: 120_000 }),
      startButton.click(),
    ])

    await capture(page, 'work-ai-processing')
    const applyButton = dialog.getByRole('button', { name: 'Apply Changes' })
    await expect(applyButton).toBeVisible({ timeout: 120_000 })
    await capture(page, 'work-ai-finished')

    await applyButton.click()
    await expect(dialog).toHaveCount(0)
    await capture(page, 'work-ai-applied')
  })
})
