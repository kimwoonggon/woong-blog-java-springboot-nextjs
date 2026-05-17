import { expect, test } from './helpers/performance-test'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

function buildRuntimeConfig() {
  return {
    provider: 'codex',
    defaultModel: 'gpt-5.4',
    codexModel: 'gpt-5.4',
    codexReasoningEffort: 'medium',
    allowedCodexModels: ['gpt-5.4', 'gpt-5.4-mini'],
    allowedCodexReasoningEfforts: ['low', 'medium', 'high'],
    batchConcurrency: 2,
    batchCompletedRetentionDays: 7,
  }
}

test('admin can cancel a running blog AI batch job from the batch panel', async ({ page }) => {
  const state = {
    status: 'running',
    cancelRequested: false,
  }

  await page.route('**/api/admin/ai/runtime-config', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/admin/ai/runtime-config') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildRuntimeConfig()),
    })
  })

  await page.route('**/api/admin/ai/blog-fix-batch-jobs/job-running/cancel', async (route) => {
    state.status = 'cancelled'
    state.cancelRequested = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobId: 'job-running' }),
    })
  })

  await page.route('**/api/admin/ai/blog-fix-batch-jobs/job-running', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/admin/ai/blog-fix-batch-jobs/job-running') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobId: 'job-running',
        status: state.status,
        selectionMode: 'selected',
        selectionLabel: '2 selected',
        selectionKey: 'blog-a,blog-b',
        autoApply: false,
        workerCount: 2,
        totalCount: 2,
        processedCount: state.status === 'cancelled' ? 2 : 0,
        succeededCount: 0,
        failedCount: 0,
        provider: 'codex',
        model: 'gpt-5.4',
        reasoningEffort: 'medium',
        createdAt: '2026-04-13T00:00:00.000Z',
        startedAt: '2026-04-13T00:00:01.000Z',
        finishedAt: state.status === 'cancelled' ? '2026-04-13T00:00:04.000Z' : null,
        cancelRequested: state.cancelRequested,
        items: [
          {
            jobItemId: 'item-a',
            blogId: 'blog-a',
            title: 'Cancel Coverage Post A',
            status: state.status === 'cancelled' ? 'cancelled' : 'running',
          },
          {
            jobItemId: 'item-b',
            blogId: 'blog-b',
            title: 'Cancel Coverage Post B',
            status: state.status === 'cancelled' ? 'cancelled' : 'pending',
          },
        ],
      }),
    })
  })

  await page.route('**/api/admin/ai/blog-fix-batch-jobs', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/admin/ai/blog-fix-batch-jobs') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs: [
          {
            jobId: 'job-running',
            status: state.status,
            selectionMode: 'selected',
            selectionLabel: '2 selected',
            selectionKey: 'blog-a,blog-b',
            autoApply: false,
            workerCount: 2,
            totalCount: 2,
            processedCount: state.status === 'cancelled' ? 2 : 0,
            succeededCount: 0,
            failedCount: 0,
            provider: 'codex',
            model: 'gpt-5.4',
            reasoningEffort: 'medium',
            createdAt: '2026-04-13T00:00:00.000Z',
            startedAt: '2026-04-13T00:00:01.000Z',
            finishedAt: state.status === 'cancelled' ? '2026-04-13T00:00:04.000Z' : null,
            cancelRequested: state.cancelRequested,
          },
        ],
        runningCount: state.status === 'running' ? 1 : 0,
        queuedCount: 0,
        completedCount: 0,
        failedCount: 0,
        cancelledCount: state.status === 'cancelled' ? 1 : 0,
      }),
    })
  })

  await page.goto('/admin/blog')
  const rows = page.getByTestId('admin-blog-row')
  await rows.nth(0).getByRole('checkbox').click()
  await rows.nth(1).getByRole('checkbox').click()
  await page.getByRole('button', { name: 'Batch AI Fix' }).click()

  await expect(page.getByTestId('admin-blog-batch-ai-panel')).toBeVisible()
  await expect(page.getByTestId('admin-blog-batch-ai-status')).toContainText('running')
  await expect(page.getByText('running 1 · queued 0 · completed 0 · failed 0 · cancelled 0')).toBeVisible()

  await page.getByRole('button', { name: 'Cancel job' }).click()

  await expect(page.getByTestId('admin-blog-batch-ai-status')).toContainText('cancelled')
  await expect(page.getByText('running 0 · queued 0 · completed 0 · failed 0 · cancelled 1')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel job' })).toHaveCount(0)
})

test('admin can cancel queued blog AI batch jobs in bulk from the batch panel', async ({ page }) => {
  const state = {
    jobOneStatus: 'queued',
    jobTwoStatus: 'queued',
  }

  await page.route('**/api/admin/ai/runtime-config', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/admin/ai/runtime-config') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildRuntimeConfig()),
    })
  })

  await page.route('**/api/admin/ai/blog-fix-batch-jobs/cancel-queued', async (route) => {
    state.jobOneStatus = 'cancelled'
    state.jobTwoStatus = 'cancelled'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ cancelled: 2 }),
    })
  })

  await page.route('**/api/admin/ai/blog-fix-batch-jobs/job-queued-1', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/admin/ai/blog-fix-batch-jobs/job-queued-1') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobId: 'job-queued-1',
        status: state.jobOneStatus,
        selectionMode: 'selected',
        selectionLabel: '2 selected',
        selectionKey: 'blog-a,blog-b',
        autoApply: false,
        workerCount: 2,
        totalCount: 2,
        processedCount: state.jobOneStatus === 'cancelled' ? 2 : 0,
        succeededCount: 0,
        failedCount: 0,
        provider: 'codex',
        model: 'gpt-5.4',
        reasoningEffort: 'medium',
        createdAt: '2026-04-13T00:00:00.000Z',
        startedAt: null,
        finishedAt: state.jobOneStatus === 'cancelled' ? '2026-04-13T00:00:03.000Z' : null,
        cancelRequested: state.jobOneStatus === 'cancelled',
        items: [
          {
            jobItemId: 'queued-item-a',
            blogId: 'blog-a',
            title: 'Queued Coverage Post A',
            status: state.jobOneStatus === 'cancelled' ? 'cancelled' : 'pending',
          },
          {
            jobItemId: 'queued-item-b',
            blogId: 'blog-b',
            title: 'Queued Coverage Post B',
            status: state.jobOneStatus === 'cancelled' ? 'cancelled' : 'pending',
          },
        ],
      }),
    })
  })

  await page.route('**/api/admin/ai/blog-fix-batch-jobs', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/admin/ai/blog-fix-batch-jobs') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs: [
          {
            jobId: 'job-queued-1',
            status: state.jobOneStatus,
            selectionMode: 'selected',
            selectionLabel: '2 selected',
            selectionKey: 'blog-a,blog-b',
            autoApply: false,
            workerCount: 2,
            totalCount: 2,
            processedCount: state.jobOneStatus === 'cancelled' ? 2 : 0,
            succeededCount: 0,
            failedCount: 0,
            provider: 'codex',
            model: 'gpt-5.4',
            reasoningEffort: 'medium',
            createdAt: '2026-04-13T00:00:00.000Z',
            startedAt: null,
            finishedAt: state.jobOneStatus === 'cancelled' ? '2026-04-13T00:00:03.000Z' : null,
            cancelRequested: state.jobOneStatus === 'cancelled',
          },
          {
            jobId: 'job-queued-2',
            status: state.jobTwoStatus,
            selectionMode: 'selected',
            selectionLabel: '3 selected',
            selectionKey: 'blog-c,blog-d,blog-e',
            autoApply: false,
            workerCount: 2,
            totalCount: 3,
            processedCount: state.jobTwoStatus === 'cancelled' ? 3 : 0,
            succeededCount: 0,
            failedCount: 0,
            provider: 'codex',
            model: 'gpt-5.4',
            reasoningEffort: 'medium',
            createdAt: '2026-04-13T00:01:00.000Z',
            startedAt: null,
            finishedAt: state.jobTwoStatus === 'cancelled' ? '2026-04-13T00:00:03.000Z' : null,
            cancelRequested: state.jobTwoStatus === 'cancelled',
          },
        ],
        runningCount: 0,
        queuedCount: state.jobOneStatus === 'queued' ? 2 : 0,
        completedCount: 0,
        failedCount: 0,
        cancelledCount: state.jobOneStatus === 'cancelled' ? 2 : 0,
      }),
    })
  })

  await page.goto('/admin/blog')
  const rows = page.getByTestId('admin-blog-row')
  await rows.nth(0).getByRole('checkbox').click()
  await rows.nth(1).getByRole('checkbox').click()
  await page.getByRole('button', { name: 'Batch AI Fix' }).click()

  await expect(page.getByRole('button', { name: 'Cancel queued (2)' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel queued (2)' }).click()

  await expect(page.getByText('Cancelled 2 queued AI job(s)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel queued (2)' })).toHaveCount(0)
  await expect(page.getByText('running 0 · queued 0 · completed 0 · failed 0 · cancelled 2')).toBeVisible()
  await expect(page.getByText('cancelled').first()).toBeVisible()
})
