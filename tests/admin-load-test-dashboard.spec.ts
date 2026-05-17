import { expect, test } from './helpers/performance-test'
import { createBlogFixture, createWorkFixture } from './helpers/content-fixtures'

test.use({ storageState: 'test-results/playwright/admin-storage-state.json' })

test('admin can run a small Work and Study read load test', async ({ page, request }, testInfo) => {
  await createWorkFixture(request, testInfo, {
    titlePrefix: 'Load Test Work Fixture',
    html: '<p>Work read load fixture body.</p>',
  })
  await createBlogFixture(request, testInfo, {
    titlePrefix: 'Load Test Study Fixture',
    html: '<p>Study read load fixture body.</p>',
  })

  const loadRequestUrls: string[] = []
  const loadRequestCookies: Array<string | undefined> = []
  let loadRequestCount = 0
  let diagnosticsRequestCount = 0
  await page.route(/\/api\/admin\/load-test\/diagnostics(?:\?[^#]*)?$/, async (route) => {
    diagnosticsRequestCount += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        process: {
          memoryBytes: 100_000_000 + diagnosticsRequestCount,
          processorCount: 8,
          memoryLimitBytes: 8 * 1024 * 1024 * 1024,
          cpuQuotaCores: 2,
        },
        gc: {
          heapSizeBytes: 40_000_000 + diagnosticsRequestCount,
          gen0Collections: diagnosticsRequestCount,
          gen1Collections: 0,
          gen2Collections: diagnosticsRequestCount > 2 ? 1 : 0,
          timeInGcPercent: diagnosticsRequestCount > 2 ? 6 : 1,
        },
        threadPool: {
          workerThreads: 4,
          pendingWorkItemCount: diagnosticsRequestCount > 2 ? 3 : 0,
          completedWorkItemCount: diagnosticsRequestCount * 10,
          availableWorkerThreads: 32763,
          maxWorkerThreads: 32767,
        },
        database: {
          status: 'available',
          latencyMs: 12 + diagnosticsRequestCount,
          openConnections: 2,
          activeConnections: 1,
          idleConnections: 1,
          idleInTransactionConnections: 0,
          commandLatency: { sampleCount: diagnosticsRequestCount, p50Ms: 5, p95Ms: 15, p99Ms: 25 },
          connectionOpenLatency: { sampleCount: diagnosticsRequestCount, p50Ms: 3, p95Ms: 9, p99Ms: 14 },
          slowQueryCount: diagnosticsRequestCount > 3 ? 1 : 0,
          recentSlowQueries: diagnosticsRequestCount > 3
            ? [{ capturedAt: new Date().toISOString(), durationMs: 355.2, sqlPreview: "select * from works where slug='?'", errorCategory: null }]
            : [],
          timeoutCount: 0,
          errorCount: 0,
          pool: {
            databaseProvider: 'Postgres',
            dbContextPoolSize: 128,
            npgsqlMinimumPoolSize: 0,
            npgsqlMaximumPoolSize: 40,
            npgsqlPoolLimitSource: 'connection-string',
          },
        },
      }),
    })
  })
  await page.route(/\/api\/public\/(?:works|blogs)(?:\/[^?]+)?(?:\?[^#]*)?__loadTestRun=/, async (route) => {
    loadRequestCount += 1
    loadRequestUrls.push(route.request().url())
    loadRequestCookies.push(route.request().headers().cookie)
    await new Promise((resolve) => setTimeout(resolve, loadRequestCount % 2 === 0 ? 350 : 80))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"items":[],"page":1,"pageSize":1,"totalItems":0,"totalPages":0}',
    })
  })

  await page.goto('/admin/load-test')

  await expect(page.getByRole('heading', { name: 'Load Test Dashboard' })).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Load Test' })).toBeVisible()
  await expect(page.getByText('Work list', { exact: true }).first()).toBeVisible()
  await expect(page.getByTestId('load-test-runtime-panel').getByText('Backend runtime')).toBeVisible()
  await expect(page.getByText('Load pattern')).toBeVisible()
  await expect(page.getByLabel('Load pattern')).toHaveValue('step')
  await expect(page.getByText(/Concurrency limits max in-flight HTTP requests/i)).toBeVisible()
  await expect(page.getByLabel('Concurrency')).toHaveAttribute('max', '1000')
  await expect(page.getByText('Work read', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Study list', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Study read', { exact: true }).first()).toBeVisible()
  await expect(page.getByLabel('Work read URL')).toHaveValue(/\/api\/public\/works\//)
  await expect(page.getByLabel('Study read URL')).toHaveValue(/\/api\/public\/blogs\//)

  await page.getByLabel('Start users').fill('2')
  await page.getByLabel('Max users').fill('2')
  await page.getByLabel('Step users').fill('1')
  await page.getByLabel('Concurrency').fill('2')
  await page.getByLabel('Work read URL').fill('/api/public/works/custom-work-target')
  await page.getByLabel('Study read URL').fill('/api/public/blogs/custom-study-target')

  await page.getByRole('button', { name: 'Run load test' }).click()

  await expect(page.getByTestId('load-test-live-status')).toContainText(/running/i)
  await expect(page.getByTestId('load-test-summary-table')).toBeVisible()

  await expect(page.getByTestId('load-test-summary-table')).toContainText('Work list')
  await expect(page.getByTestId('load-test-summary-table')).toContainText('Completed', { timeout: 15000 })
  await expect(page.getByTestId('load-test-summary-table')).toContainText('2 / 2')
  await expect(page.getByTestId('load-test-summary-table')).toContainText('Study list')
  await expect(page.getByTestId('load-test-result-count')).toContainText(/4 scenarios/)
  await expect(page.getByText(/configured 2 · observed peak/i)).toBeVisible()
  await expect(page.getByText(/^Elapsed$/)).toBeVisible()
  await expect(page.getByTestId('load-test-runtime-panel')).toContainText(/Memory/)
  await expect(page.getByTestId('load-test-runtime-panel')).toContainText(/Memory limit/)
  await expect(page.getByTestId('load-test-runtime-panel')).toContainText(/CPU quota/)
  await expect(page.getByTestId('load-test-runtime-panel')).toContainText(/ThreadPool workers/)
  await expect(page.getByTestId('load-test-runtime-panel')).toContainText(/ThreadPool queue/)
  await expect(page.getByTestId('load-test-runtime-panel')).toContainText(/DB latency/)
  await expect(page.getByTestId('load-test-database-panel')).toContainText(/DB command P95/)
  await expect(page.getByTestId('load-test-database-panel')).toContainText(/DB connection open P95/)
  await expect(page.getByTestId('load-test-database-panel')).toContainText(/DbContext pool/)
  await expect(page.getByTestId('load-test-database-panel')).toContainText(/Npgsql max pool/)
  await expect(page.getByTestId('load-test-database-panel')).toContainText(/Idle connections/)
  expect(diagnosticsRequestCount).toBeGreaterThan(0)
  expect(loadRequestUrls.some((url) => url.includes('/api/public/works/custom-work-target?'))).toBe(true)
  expect(loadRequestUrls.some((url) => url.includes('/api/public/blogs/custom-study-target?'))).toBe(true)
  expect(loadRequestUrls.some((url) => url.includes('__loadTestUser=1'))).toBe(true)
  expect(loadRequestUrls.some((url) => url.includes('__loadTestUser=2'))).toBe(true)
  expect(loadRequestCookies.every((cookie) => !cookie)).toBe(true)
})

test('admin can run and stop a real backend test with polling + metrics fallback', async ({ page, request }, testInfo) => {
  await createWorkFixture(request, testInfo, {
    titlePrefix: 'Real Load Work Fixture',
    html: '<p>Real backend work target fixture body.</p>',
  })
  await createBlogFixture(request, testInfo, {
    titlePrefix: 'Real Load Study Fixture',
    html: '<p>Real backend study target fixture body.</p>',
  })

  let startCallCount = 0
  let stopCallCount = 0
  let statusCallCount = 0
  let metricsCallCount = 0
  let diagnosticsRequestCount = 0
  let stopRequested = false
  let postedStartPayload: Record<string, unknown> | null = null
  let postedStartCsrfHeader: string | undefined
  let postedStopCsrfHeader: string | undefined

  await page.route(/\/api\/admin\/load-tests\/real\/start(?:\?[^#]*)?$/, async (route) => {
    startCallCount += 1
    postedStartCsrfHeader = route.request().headers()['x-csrf-token']
    const requestBody = route.request().postDataJSON()
    postedStartPayload = requestBody && typeof requestBody === 'object'
      ? requestBody as Record<string, unknown>
      : null
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ runId: 'real-run-1', status: 'queued' }),
    })
  })

  await page.route(/\/api\/admin\/load-tests\/real\/real-run-1(?:\?[^#]*)?$/, async (route) => {
    statusCallCount += 1
    const statusText = stopRequested
      ? 'stopped'
      : statusCallCount <= 1
        ? 'queued'
        : 'running'

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: 'real-run-1',
        status: statusText,
        requests: stopRequested ? 12 : 10,
      }),
    })
  })

  await page.route(/\/api\/admin\/load-tests\/real\/real-run-1\/metrics(?:\?[^#]*)?$/, async (route) => {
    metricsCallCount += 1
    if (metricsCallCount <= 2) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'running',
          totalRequests: 0,
          currentRps: 0,
          p95Ms: 0,
          latencyBreakdown: {
            minMs: 0,
            p50Ms: 0,
            p95Ms: 0,
            p99Ms: 0,
            maxMs: 0,
            appElapsedP95Ms: 0,
          },
          statusCounts: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
          targetMetrics: [],
          metrics: [],
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        throughputRps: 123.4,
        latencyMs: 45.6,
        latencyBreakdown: {
          minMs: 11,
          p50Ms: 33.3,
          p95Ms: 45.6,
          p99Ms: 78.9,
          maxMs: 90,
          appElapsedP95Ms: 35.4,
          nginxRequestTimeP95Ms: 48.2,
          nginxUpstreamP95Ms: 39.1,
        },
        httpCounts: {
          total: stopRequested ? 12 : 10,
          success: stopRequested ? 11 : 9,
          failed: 1,
          status2xx: stopRequested ? 11 : 9,
          status3xx: 0,
          status4xx: 0,
          status5xx: 1,
        },
        targetMetrics: [
          {
            targetId: 'study-list',
            targetLabel: 'Study list',
            targetPath: '/api/public/blogs?page=1&pageSize=12',
            group: 'study',
            requestCount: stopRequested ? 6 : 5,
            successCount: stopRequested ? 6 : 5,
            failureCount: 0,
            p95Ms: 35.5,
            statusCounts: { '2xx': stopRequested ? 6 : 5 },
          },
          {
            targetId: 'study-read',
            targetLabel: 'Study read',
            targetPath: '/api/public/blogs/custom-real-study',
            group: 'study',
            requestCount: stopRequested ? 6 : 5,
            successCount: stopRequested ? 5 : 4,
            failureCount: 1,
            p95Ms: 45.6,
            statusCounts: { '2xx': stopRequested ? 5 : 4, '5xx': 1 },
          },
        ],
      }),
    })
  })

  await page.route(/\/api\/admin\/load-tests\/real\/real-run-1\/stop(?:\?[^#]*)?$/, async (route) => {
    stopCallCount += 1
    postedStopCsrfHeader = route.request().headers()['x-csrf-token']
    stopRequested = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'stopping' }),
    })
  })

  await page.route(/\/api\/admin\/load-test\/diagnostics(?:\?[^#]*)?$/, async (route) => {
    diagnosticsRequestCount += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        process: {
          memoryBytes: 200_000_000 + diagnosticsRequestCount,
          processorCount: 8,
          memoryLimitBytes: 8 * 1024 * 1024 * 1024,
          cpuQuotaCores: 2,
        },
        gc: {
          heapSizeBytes: 75_000_000 + diagnosticsRequestCount,
          gen0Collections: diagnosticsRequestCount,
          gen1Collections: 1,
          gen2Collections: diagnosticsRequestCount > 1 ? 2 : 1,
          timeInGcPercent: diagnosticsRequestCount > 1 ? 7 : 2,
        },
        threadPool: {
          workerThreads: 6,
          pendingWorkItemCount: diagnosticsRequestCount > 1 ? 4 : 1,
          completedWorkItemCount: diagnosticsRequestCount * 20,
          availableWorkerThreads: 32761,
          maxWorkerThreads: 32767,
        },
        database: {
          status: 'available',
          latencyMs: 18 + diagnosticsRequestCount,
          openConnections: 5,
          activeConnections: 2,
          idleConnections: 3,
          idleInTransactionConnections: 1,
          commandLatency: { sampleCount: diagnosticsRequestCount, p50Ms: 8, p95Ms: 22, p99Ms: 31 },
          connectionOpenLatency: { sampleCount: diagnosticsRequestCount, p50Ms: 4, p95Ms: 11, p99Ms: 17 },
          slowQueryCount: diagnosticsRequestCount > 1 ? 1 : 0,
          recentSlowQueries: [],
          timeoutCount: 0,
          errorCount: diagnosticsRequestCount > 1 ? 2 : 0,
          pool: {
            databaseProvider: 'Postgres',
            dbContextPoolSize: 128,
            npgsqlMinimumPoolSize: 0,
            npgsqlMaximumPoolSize: 40,
            npgsqlPoolLimitSource: 'connection-string',
          },
        },
      }),
    })
  })

  await page.goto('/admin/load-test')

  const panel = page.getByTestId('real-backend-test-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByText('Browser Test uses browser-generated fetch load.')).toBeVisible()
  await expect(panel.getByText('Latency breakdown is unavailable for this run.')).toBeVisible()
  await expect(panel.getByTestId('real-backend-execution-profile')).toContainText('Constant arrival rate')
  await expect(panel.getByLabel('Target RPS')).toHaveValue('10')
  await expect(panel.getByLabel('Max VUs cap')).toHaveValue('10')
  await page.getByLabel('Study read URL').fill('/api/public/blogs/custom-real-study')

  await panel.getByLabel('Real backend scenario').selectOption('public-api-stress')
  await expect(panel.getByTestId('real-backend-execution-profile')).toContainText('Stress VUs')
  await expect(panel.getByLabel('Start VUs')).toHaveValue('1')
  await expect(panel.getByLabel('Max VUs')).toHaveValue('10')
  await expect(panel.getByLabel('Rate')).toBeHidden()
  await panel.getByLabel('Real backend target').selectOption('public-blogs-only')
  await panel.getByLabel('Real backend runner').selectOption('k6')
  await panel.getByLabel('Start VUs').fill('5')
  await panel.getByLabel('Duration seconds').fill('45')
  await panel.getByLabel('Max VUs').fill('40')

  await panel.getByRole('button', { name: 'Start real backend test' }).click()

  await expect(panel.getByTestId('real-backend-live-status')).toContainText(/queued/i)
  await expect.poll(() => startCallCount).toBe(1)
  expect(postedStartCsrfHeader).toBeTruthy()
  expect(postedStartPayload).toMatchObject({
    scenario: 'public-api-stress',
    target: 'public-blogs-only',
    runner: 'k6',
    rate: 10,
    peakRate: 20,
    durationSeconds: 45,
    maxVUs: 40,
    startVUs: 5,
    targets: [
      { id: 'study-list', label: 'Study list', path: '/api/public/blogs?page=1&pageSize=12', group: 'study' },
      { id: 'study-read', label: 'Study read', path: '/api/public/blogs/custom-real-study', group: 'study' },
    ],
  })
  await expect.poll(() => statusCallCount).toBeGreaterThan(0)
  await expect.poll(() => metricsCallCount).toBeGreaterThan(0)
  await expect(panel.getByTestId('real-backend-live-status')).toContainText(/running/i)
  await expect(panel.getByText(/^summary pending$/i).first()).toBeVisible()
  await expect(panel.getByText(/ASP\.NET app elapsed p95: 35\.4 ms/i)).toBeVisible()
  await expect(panel.getByText(/nginx request_time p95: 48\.2 ms/i)).toBeVisible()
  await expect(panel.getByText(/nginx upstream p95: 39\.1 ms/i)).toBeVisible()
  await expect(panel.getByText(/db command p95: 22 ms/i)).toBeVisible()
  await expect(panel.getByText('123.4 rps')).toBeVisible()
  await expect(panel.getByRole('paragraph').filter({ hasText: /^45\.6 ms$/ })).toBeVisible()
  await expect(panel.getByText(/total 10 · ok 9 · failed 1/i)).toBeVisible()
  await expect(panel.getByTestId('real-backend-target-summary')).toContainText('Study list')
  await expect(panel.getByTestId('real-backend-target-summary')).toContainText('/api/public/blogs/custom-real-study')
  await expect(panel.getByTestId('real-backend-target-summary')).toContainText('5 / 5')
  await expect.poll(() => diagnosticsRequestCount).toBeGreaterThan(0)
  await expect(page.getByTestId('load-test-runtime-panel')).toContainText(/Time in GC/)
  await expect(page.getByTestId('load-test-runtime-panel')).toContainText(/CPU quota/)
  await expect(page.getByTestId('load-test-runtime-panel')).toContainText(/ThreadPool queue/)
  await expect(page.getByTestId('load-test-runtime-panel')).toContainText(/Runtime red/)
  await expect(page.getByTestId('load-test-runtime-panel')).toContainText(/samples collected from the ASP\.NET Core backend/)
  await expect(page.getByTestId('load-test-database-panel')).toContainText(/DB command P95/)
  await expect(page.getByTestId('load-test-database-panel')).toContainText(/Npgsql max pool/)
  await expect(page.getByTestId('load-test-database-panel')).toContainText(/DB errors/)
  await expect(page.getByTestId('load-test-database-panel')).toContainText(/Idle in transaction/)

  await panel.getByRole('button', { name: 'Stop real backend test' }).click()
  await expect.poll(() => stopCallCount).toBe(1)
  expect(postedStopCsrfHeader).toBeTruthy()
  await expect(panel.getByTestId('real-backend-live-status')).toContainText(/stopped/i)
  await expect(panel.getByText(/total 12 · ok 11 · failed 1/i)).toBeVisible()
  await expect(panel.getByTestId('real-backend-target-summary')).toContainText('6 / 6')
})
