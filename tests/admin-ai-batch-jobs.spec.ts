import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('admin can create, observe, and apply a blog AI batch job without blocking the workspace', async ({ page }) => {
  test.setTimeout(180_000)
  const state = {
    status: 'idle',
    applied: false,
  }

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
        body: JSON.stringify({ jobId: 'mock-batch-job' }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs: [
          {
            jobId: 'mock-batch-job',
            status: state.status === 'idle' ? 'completed' : state.status,
            selectionMode: 'selected',
            selectionLabel: '2 selected',
            selectionKey: 'mock-a,mock-b',
            autoApply: false,
            workerCount: 2,
            totalCount: 2,
            processedCount: 2,
            succeededCount: state.applied ? 2 : 2,
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

  await page.route('**/api/admin/ai/blog-fix-batch-jobs/mock-batch-job', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/admin/ai/blog-fix-batch-jobs/mock-batch-job') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobId: 'mock-batch-job',
        status: 'completed',
        selectionMode: 'selected',
        selectionLabel: '2 selected',
        selectionKey: 'mock-a,mock-b',
        autoApply: false,
        workerCount: 2,
        totalCount: 2,
        processedCount: 2,
        succeededCount: 2,
        failedCount: 0,
        provider: 'codex',
        model: 'gpt-5.4',
        reasoningEffort: 'medium',
        createdAt: '2026-04-13T00:00:00.000Z',
        startedAt: '2026-04-13T00:00:01.000Z',
        finishedAt: '2026-04-13T00:00:02.000Z',
        cancelRequested: false,
        items: [
          { jobItemId: 'a', blogId: 'a', title: 'A', status: state.applied ? 'applied' : 'succeeded', fixedHtml: '<p>A</p>' },
          { jobItemId: 'b', blogId: 'b', title: 'B', status: state.applied ? 'applied' : 'succeeded', fixedHtml: '<p>B</p>' },
        ],
      }),
    })
  })

  await page.route('**/api/admin/ai/blog-fix-batch-jobs/mock-batch-job/apply', async (route) => {
    state.applied = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobId: 'mock-batch-job',
        status: 'completed',
        selectionMode: 'selected',
        selectionLabel: '2 selected',
        selectionKey: 'mock-a,mock-b',
        autoApply: false,
        workerCount: 2,
        totalCount: 2,
        processedCount: 2,
        succeededCount: 2,
        failedCount: 0,
        provider: 'codex',
        model: 'gpt-5.4',
        reasoningEffort: 'medium',
        createdAt: '2026-04-13T00:00:00.000Z',
        startedAt: '2026-04-13T00:00:01.000Z',
        finishedAt: '2026-04-13T00:00:02.000Z',
        cancelRequested: false,
        items: [
          { jobItemId: 'a', blogId: 'a', title: 'A', status: 'applied', fixedHtml: '<p>A</p>', appliedAt: '2026-04-13T00:00:03.000Z' },
          { jobItemId: 'b', blogId: 'b', title: 'B', status: 'applied', fixedHtml: '<p>B</p>', appliedAt: '2026-04-13T00:00:03.000Z' },
        ],
      }),
    })
  })

  await page.goto('/admin/blog')
  await expect(page.getByRole('heading', { name: 'Blog Posts' })).toBeVisible()

  const rows = page.getByTestId('admin-blog-row')
  const count = await rows.count()
  expect(count).toBeGreaterThan(1)

  await rows.nth(0).getByRole('checkbox').click()
  await rows.nth(1).getByRole('checkbox').click()

  await expect(page.getByRole('button', { name: 'Delete Selected' })).toBeVisible()
  await expect(page.getByTestId('admin-blog-batch-ai-panel')).toHaveCount(0)
  await page.getByRole('button', { name: 'Batch AI Fix' }).click()
  await expect(page.getByTestId('admin-blog-batch-ai-panel')).toBeVisible()
  await expect(page.getByLabel('Batch AI provider')).toBeVisible()
  await expect(page.getByRole('option', { name: 'OPENAI' })).toBeAttached()
  await expect(page.getByRole('option', { name: 'CODEX' })).toBeAttached()
  const clearCompleted = page.getByRole('button', { name: /Clear completed/i })
  if (await clearCompleted.isVisible().catch(() => false)) {
    await clearCompleted.click()
    await expect(clearCompleted).toHaveCount(0)
  }
  await expect(page.getByRole('button', { name: 'Generate AI Fix job' })).toBeEnabled()

  await page.getByRole('button', { name: 'Generate AI Fix job' }).click()

  await expect(page.getByTestId('admin-blog-batch-ai-panel')).toBeVisible()
  await expect(page.getByTestId('admin-blog-batch-ai-status')).toContainText(/queued|running|processed/i)

  await expect(page.getByTestId('admin-blog-batch-ai-status')).toContainText('completed', { timeout: 30_000 })
  await expect(page.getByTestId('admin-blog-batch-ai-status')).toContainText('2/2 processed', { timeout: 30_000 })
  const applyAll = page.getByRole('button', { name: 'Apply all successful' })
  await expect(applyAll).toBeVisible({ timeout: 30_000 })
  await applyAll.click()

  await expect(page.getByText('applied').first()).toBeVisible({ timeout: 30_000 })
})
