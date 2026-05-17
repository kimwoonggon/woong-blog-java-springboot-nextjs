import { expect, test, type Page } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

async function createTemporaryBlog(page: Page, title: string) {
  await page.goto('/admin/blog/new')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Tags (comma separated)').fill('playwright, e2e, batch')
  await page.getByRole('checkbox', { name: 'Published' }).uncheck()

  const editor = page.locator('.tiptap.ProseMirror').first()
  await editor.click()
  await page.keyboard.type(`Temporary batch-management content for ${title}.`)

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/admin/blogs') && res.request().method() === 'POST' && res.ok()),
    page.getByRole('button', { name: /Create Post/i }).click(),
  ])

  return response.json() as Promise<{ id: string; slug: string }>
}

test('E2E-009 admin can run a batch AI workflow and then bulk delete the processed items', async ({ page }) => {
  test.setTimeout(300_000)
  const state = {
    status: 'idle',
  }

  await page.route('**/api/admin/ai/runtime-config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'codex',
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

  await page.route('**/api/admin/ai/blog-fix-batch-jobs', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname !== '/api/admin/ai/blog-fix-batch-jobs') {
      await route.fallback()
      return
    }

    if (route.request().method() === 'POST') {
      state.status = 'completed'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jobId: 'mock-e2e-job' }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs: [
          {
            jobId: 'mock-e2e-job',
            status: state.status === 'idle' ? 'completed' : state.status,
            selectionMode: 'selected',
            selectionLabel: '1 selected',
            selectionKey: 'mock-e2e',
            autoApply: false,
            workerCount: 1,
            totalCount: 1,
            processedCount: 1,
            succeededCount: 1,
            failedCount: 0,
            provider: 'codex',
            model: 'gpt-5.4',
            reasoningEffort: 'medium',
            createdAt: '2026-04-13T00:00:00.000Z',
            startedAt: '2026-04-13T00:00:01.000Z',
            finishedAt: '2026-04-13T00:00:02.000Z',
            cancelRequested: false,
          },
        ],
        runningCount: 0,
        queuedCount: 0,
        completedCount: 1,
        failedCount: 0,
        cancelledCount: 0,
      }),
    })
  })

  await page.route('**/api/admin/ai/blog-fix-batch-jobs/mock-e2e-job', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/admin/ai/blog-fix-batch-jobs/mock-e2e-job') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobId: 'mock-e2e-job',
        status: 'completed',
        selectionMode: 'selected',
        selectionLabel: '1 selected',
        selectionKey: 'mock-e2e',
        autoApply: false,
        workerCount: 1,
        totalCount: 1,
        processedCount: 1,
        succeededCount: 1,
        failedCount: 0,
        provider: 'codex',
        model: 'gpt-5.4',
        reasoningEffort: 'medium',
        createdAt: '2026-04-13T00:00:00.000Z',
        startedAt: '2026-04-13T00:00:01.000Z',
        finishedAt: '2026-04-13T00:00:02.000Z',
        cancelRequested: false,
        items: [
          { jobItemId: 'a', blogId: 'a', title: 'A', status: 'succeeded', fixedHtml: '<p>A</p>' },
        ],
      }),
    })
  })

  const title = `E2E 009 Batch ${Date.now()}`
  const first = await createTemporaryBlog(page, title)

  await page.goto('/admin/blog')
  await page.getByLabel('Search blog titles').fill(title)

  const targetRow = page.getByTestId('admin-blog-row').filter({ hasText: title }).first()
  await expect(targetRow).toBeVisible()
  await targetRow.getByRole('checkbox').check()

  await page.getByRole('button', { name: 'Batch AI Fix' }).click()
  await expect(page.getByTestId('admin-blog-batch-ai-panel')).toBeVisible()
  await page.getByRole('button', { name: 'Generate AI Fix job' }).click()

  await expect(page.getByTestId('admin-blog-batch-ai-status')).toContainText('completed', { timeout: 30_000 })
  await expect(page.getByTestId('admin-blog-batch-ai-status')).toContainText('1/1 processed', { timeout: 30_000 })

  await page.getByLabel('Search blog titles').fill(title)
  const refreshedRow = page.getByTestId('admin-blog-row').filter({ hasText: title }).first()
  await expect(refreshedRow).toBeVisible()
  await refreshedRow.getByRole('checkbox').check()

  await page.getByRole('button', { name: 'Delete Selected' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes(`/api/admin/blogs/${first.id}`) && response.request().method() === 'DELETE' && response.ok(),
    ),
    dialog.getByRole('button', { name: 'Delete' }).click(),
  ])

  await expect(page.getByTestId('admin-blog-row').filter({ hasText: title })).toHaveCount(0)
})
