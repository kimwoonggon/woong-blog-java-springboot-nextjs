import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOAD_TEST_CONFIG,
  DEFAULT_REAL_BACKEND_TEST_CONFIG,
  MAX_CONCURRENCY,
  MAX_USERS,
  buildDiagnosticsSnapshotSummary,
  buildLoadTestTargets,
  buildRealBackendStartPayload,
  buildSoakUserTimeline,
  buildSpikeUserTimeline,
  buildUserSteps,
  describeRealBackendExecutionProfile,
  estimatePatternRequestCount,
  evaluateHttpScenarioHealth,
  evaluateRuntimeDiagnosticsHealth,
  extractRealBackendLatencyBreakdown,
  isRuntimeDiagnosticsPayload,
  runWithConcurrency,
  sanitizeRealBackendTestConfig,
  sanitizeLoadTestConfig,
  summarizeRealBackendRunSnapshot,
  summarizeLoadTestSamples,
} from '@/lib/load-test-dashboard'

describe('load test dashboard planning', () => {
  it('uses 100-user intervals up to 1000 users by default', () => {
    expect(buildUserSteps(DEFAULT_LOAD_TEST_CONFIG)).toEqual([
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900,
      1000,
    ])
  })

  it('models step, soak, and spike scenario planning', () => {
    expect(buildUserSteps({
      ...DEFAULT_LOAD_TEST_CONFIG,
      pattern: 'step',
      startUsers: 100,
      maxUsers: 300,
      stepUsers: 100,
    })).toEqual([100, 200, 300])

    expect(buildUserSteps({
      ...DEFAULT_LOAD_TEST_CONFIG,
      pattern: 'soak',
      startUsers: 100,
      maxUsers: 500,
    })).toEqual([500])

    expect(buildUserSteps({
      ...DEFAULT_LOAD_TEST_CONFIG,
      pattern: 'spike',
      startUsers: 100,
      maxUsers: 1000,
    })).toEqual([1000])
  })

  it('clamps unsafe or invalid user input to the supported dashboard range', () => {
    expect(sanitizeLoadTestConfig({
      startUsers: -10,
      maxUsers: 20_000,
      stepUsers: 0,
      requestsPerUser: 0,
      concurrency: 5000,
      timeoutMs: 100,
    })).toEqual({
      startUsers: 1,
      maxUsers: MAX_USERS,
      stepUsers: 1,
      requestsPerUser: 1,
      concurrency: MAX_CONCURRENCY,
      timeoutMs: 1000,
      pattern: 'step',
      soakDurationSeconds: 300,
      spikeRampSeconds: 60,
    })
  })

  it('builds soak and spike timelines from duration seconds', () => {
    expect(buildSoakUserTimeline({
      ...DEFAULT_LOAD_TEST_CONFIG,
      pattern: 'soak',
      maxUsers: 250,
      soakDurationSeconds: 12,
    })).toEqual(Array.from({ length: 12 }, () => 250))

    expect(buildSpikeUserTimeline({
      ...DEFAULT_LOAD_TEST_CONFIG,
      pattern: 'spike',
      startUsers: 100,
      maxUsers: 220,
      spikeRampSeconds: 10,
    })).toEqual([100, 113, 127, 140, 153, 167, 180, 193, 207, 220])
  })

  it('estimates pattern request counts using time-based soak and spike execution', () => {
    expect(estimatePatternRequestCount({
      ...DEFAULT_LOAD_TEST_CONFIG,
      pattern: 'step',
      startUsers: 100,
      maxUsers: 300,
      stepUsers: 100,
      requestsPerUser: 2,
    })).toBe(1200)

    expect(estimatePatternRequestCount({
      ...DEFAULT_LOAD_TEST_CONFIG,
      pattern: 'soak',
      startUsers: 1,
      maxUsers: 5,
      requestsPerUser: 3,
      soakDurationSeconds: 10,
    })).toBe(150)

    expect(estimatePatternRequestCount({
      ...DEFAULT_LOAD_TEST_CONFIG,
      pattern: 'spike',
      startUsers: 2,
      maxUsers: 4,
      requestsPerUser: 1,
      spikeRampSeconds: 10,
    })).toBe(30)
  })

  it('never exceeds configured in-flight concurrency in runWithConcurrency', async () => {
    let inFlight = 0
    let peakInFlight = 0

    const tasks = Array.from({ length: 20 }, (_, index) => async () => {
      inFlight += 1
      peakInFlight = Math.max(peakInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 10))
      inFlight -= 1
      return index
    })

    const results = await runWithConcurrency(tasks, 4)

    expect(peakInFlight).toBeLessThanOrEqual(4)
    expect(results).toEqual(Array.from({ length: 20 }, (_, index) => index))
  })

  it('handles concurrency larger than task count without dropping tasks', async () => {
    const tasks = Array.from({ length: 3 }, (_, index) => async () => index + 1)
    await expect(runWithConcurrency(tasks, 1000)).resolves.toEqual([1, 2, 3])
  })

  it('allows max users up to 10,000', () => {
    expect(sanitizeLoadTestConfig({
      startUsers: 500,
      maxUsers: 10000,
      stepUsers: 500,
      requestsPerUser: 1,
      concurrency: 10,
      timeoutMs: 10_000,
    })).toEqual({
      startUsers: 500,
      maxUsers: 10000,
      stepUsers: 500,
      requestsPerUser: 1,
      concurrency: 10,
      timeoutMs: 10_000,
      pattern: 'step',
      soakDurationSeconds: 300,
      spikeRampSeconds: 60,
    })
  })

  it('builds Work and Study list/read targets from public slugs', () => {
    expect(buildLoadTestTargets({
      workSlugs: ['portfolio-api'],
      blogSlugs: ['nextjs-study'],
    })).toEqual([
      { id: 'works-list', label: 'Work list', path: '/api/public/works?page=1&pageSize=12', group: 'work' },
      { id: 'work-read', label: 'Work read', path: '/api/public/works/portfolio-api', group: 'work' },
      { id: 'study-list', label: 'Study list', path: '/api/public/blogs?page=1&pageSize=12', group: 'study' },
      { id: 'study-read', label: 'Study read', path: '/api/public/blogs/nextjs-study', group: 'study' },
    ])
  })

  it('keeps fetched public slug order instead of forcing seeded fixtures', () => {
    expect(buildLoadTestTargets({
      workSlugs: ['latest-heavy-work', 'seeded-work'],
      blogSlugs: ['latest-heavy-study', 'seeded-blog'],
    })).toEqual([
      { id: 'works-list', label: 'Work list', path: '/api/public/works?page=1&pageSize=12', group: 'work' },
      { id: 'work-read', label: 'Work read', path: '/api/public/works/latest-heavy-work', group: 'work' },
      { id: 'study-list', label: 'Study list', path: '/api/public/blogs?page=1&pageSize=12', group: 'study' },
      { id: 'study-read', label: 'Study read', path: '/api/public/blogs/latest-heavy-study', group: 'study' },
    ])
  })

  it('adds distinct virtual-user identity to every load-test request URL', async () => {
    const { appendLoadTestCacheBust } = await import('@/lib/load-test-dashboard')

    expect(appendLoadTestCacheBust('/api/public/works/demo', 'run-1', 0, 3)).toBe(
      '/api/public/works/demo?__loadTestRun=run-1&__loadTestUser=1&__loadTestRequest=0&__loadTestIteration=1',
    )
    expect(appendLoadTestCacheBust('/api/public/works/demo', 'run-1', 3, 3)).toBe(
      '/api/public/works/demo?__loadTestRun=run-1&__loadTestUser=1&__loadTestRequest=3&__loadTestIteration=2',
    )
    expect(appendLoadTestCacheBust('/api/public/works?page=1', 'run-1', 1, 3)).toContain(
      '/api/public/works?page=1&__loadTestRun=run-1&__loadTestUser=2',
    )
  })

  it('summarizes request samples with percentiles and error rate', () => {
    const result = summarizeLoadTestSamples(
      { id: 'work-read', label: 'Work read', path: '/works/demo', group: 'work' },
      200,
      [
        { ok: true, status: 200, durationMs: 100 },
        { ok: true, status: 200, durationMs: 120 },
        { ok: true, status: 200, durationMs: 500 },
        { ok: false, status: 500, durationMs: 900 },
      ],
    )

    expect(result).toMatchObject({
      targetId: 'work-read',
      targetLabel: 'Work read',
      targetPath: '/works/demo',
      userCount: 200,
      requestCount: 4,
      successCount: 3,
      failureCount: 1,
      errorRate: 25,
      minMs: 100,
      avgMs: 405,
      p50Ms: 120,
      p95Ms: 900,
      maxMs: 900,
      http5xxCount: 1,
      status429Count: 0,
      status503Count: 0,
      timeoutCount: 0,
      abortedCount: 0,
    })
  })

  it('separates 429/503, timeout, and aborted failures', () => {
    const result = summarizeLoadTestSamples(
      { id: 'works-list', label: 'Work list', path: '/api/public/works', group: 'work' },
      10,
      [
        { ok: false, status: 429, durationMs: 40 },
        { ok: false, status: 503, durationMs: 50 },
        { ok: false, status: 500, durationMs: 60 },
        { ok: false, durationMs: 70, error: 'Request timed out' },
        { ok: false, durationMs: 80, error: 'The operation was aborted' },
      ],
    )

    expect(result).toMatchObject({
      failureCount: 5,
      http5xxCount: 2,
      status429Count: 1,
      status503Count: 1,
      timeoutCount: 1,
      abortedCount: 1,
    })
  })

  it('scores HTTP result health with initial green yellow red thresholds', () => {
    const target = { id: 'work-read', label: 'Work read', path: '/works/demo', group: 'work' as const }

    expect(evaluateHttpScenarioHealth({
      ...summarizeLoadTestSamples(target, 100, [{ ok: true, durationMs: 250 }]),
    })).toMatchObject({ status: 'green' })

    expect(evaluateHttpScenarioHealth({
      ...summarizeLoadTestSamples(target, 100, [{ ok: true, durationMs: 500 }]),
    })).toMatchObject({ status: 'yellow' })

    expect(evaluateHttpScenarioHealth({
      ...summarizeLoadTestSamples(target, 100, [{ ok: false, status: 500, durationMs: 900 }]),
    })).toMatchObject({ status: 'red' })
  })

  it('validates runtime diagnostics payloads and summarizes current peak delta values', () => {
    const first = {
      timestamp: '2026-05-04T00:00:00Z',
      process: { memoryBytes: 1000, processorCount: 8, memoryLimitBytes: 8 * 1024, cpuQuotaCores: 2 },
      gc: { heapSizeBytes: 500, gen0Collections: 1, gen1Collections: 0, gen2Collections: 0, timeInGcPercent: 1 },
      threadPool: { workerThreads: 2, pendingWorkItemCount: 0, completedWorkItemCount: 20, availableWorkerThreads: 98, maxWorkerThreads: 100 },
      database: {
        status: 'available' as const,
        latencyMs: 10,
        openConnections: 3,
        activeConnections: 1,
        idleConnections: 2,
        idleInTransactionConnections: 0,
        timeoutCount: 0,
      },
    }
    const second = {
      ...first,
      timestamp: '2026-05-04T00:01:00Z',
      process: { memoryBytes: 1800, processorCount: 8, memoryLimitBytes: 8 * 1024, cpuQuotaCores: 2 },
      gc: { heapSizeBytes: 900, gen0Collections: 3, gen1Collections: 1, gen2Collections: 2, timeInGcPercent: 12 },
      threadPool: { workerThreads: 8, pendingWorkItemCount: 40, completedWorkItemCount: 120, availableWorkerThreads: 92, maxWorkerThreads: 100 },
      database: {
        status: 'available' as const,
        latencyMs: 260,
        openConnections: 20,
        activeConnections: 16,
        idleConnections: 4,
        idleInTransactionConnections: 2,
        commandLatency: { sampleCount: 3, p50Ms: 8, p95Ms: 45, p99Ms: 90 },
        connectionOpenLatency: { sampleCount: 3, p50Ms: 4, p95Ms: 30, p99Ms: 60 },
        slowQueryCount: 2,
        recentSlowQueries: [{ capturedAt: '2026-05-04T00:01:00Z', durationMs: 355.2, sqlPreview: "select * from works where slug='?'" }],
        timeoutCount: 1,
        errorCount: 1,
        pool: {
          databaseProvider: 'Postgres',
          dbContextPoolSize: 128,
          npgsqlMinimumPoolSize: 0,
          npgsqlMaximumPoolSize: 40,
          npgsqlPoolLimitSource: 'connection-string',
        },
      },
    }

    expect(isRuntimeDiagnosticsPayload(first)).toBe(true)
    expect(isRuntimeDiagnosticsPayload({ timestamp: 'bad' })).toBe(false)
    expect(buildDiagnosticsSnapshotSummary([first, second])).toMatchObject({
      sampleCount: 2,
      memoryBytes: { current: 1800, peak: 1800, delta: 800 },
      memoryLimitBytes: { current: 8192, peak: 8192, delta: 0 },
      processorCount: { current: 8, peak: 8, delta: 0 },
      cpuQuotaCores: { current: 2, peak: 2, delta: 0 },
      gcHeapBytes: { current: 900, peak: 900, delta: 400 },
      gen2Collections: { current: 2, peak: 2, delta: 2 },
      threadPoolWorkerThreads: { current: 8, peak: 8, delta: 6 },
      threadPoolQueueLength: { current: 40, peak: 40, delta: 40 },
      threadPoolCompletedWorkItemCount: { current: 120, peak: 120, delta: 100 },
      databaseLatencyMs: { current: 260, peak: 260, delta: 250 },
      databaseTimeoutCount: { current: 1, peak: 1, delta: 1 },
      dbCommandP95Ms: { current: 45, peak: 45, delta: 0 },
      dbCommandP99Ms: { current: 90, peak: 90, delta: 0 },
      dbConnectionOpenP95Ms: { current: 30, peak: 30, delta: 0 },
      dbCommandP95Available: true,
      dbCommandP99Available: true,
      dbConnectionOpenP95Available: true,
      dbSlowQueryCount: { current: 2, peak: 2, delta: 2 },
      dbIdleConnections: { current: 4, peak: 4, delta: 2 },
      dbIdleInTransactionConnections: { current: 2, peak: 2, delta: 2 },
      dbContextPoolSize: { current: 128, peak: 128, delta: 0 },
      dbNpgsqlMaximumPoolSize: { current: 40, peak: 40, delta: 0 },
      dbNpgsqlPoolConfigured: true,
    })
  })

  it('flags runtime and DB pressure from diagnostics snapshots without failing on unavailable metrics', () => {
    expect(evaluateRuntimeDiagnosticsHealth([])).toMatchObject({ status: 'unavailable' })

    const summary = buildDiagnosticsSnapshotSummary([
      {
        timestamp: '2026-05-04T00:00:00Z',
        process: { memoryBytes: 1000, processorCount: 8 },
        gc: { heapSizeBytes: 500, gen0Collections: 1, gen1Collections: 0, gen2Collections: 0, timeInGcPercent: 1 },
        threadPool: { workerThreads: 2, pendingWorkItemCount: 0, completedWorkItemCount: 20, availableWorkerThreads: 98, maxWorkerThreads: 100 },
        database: {
          status: 'unavailable',
          latencyMs: null,
          openConnections: null,
          activeConnections: null,
          idleConnections: null,
          idleInTransactionConnections: null,
          timeoutCount: 0,
        },
      },
      {
        timestamp: '2026-05-04T00:01:00Z',
        process: { memoryBytes: 1800, processorCount: 8 },
        gc: { heapSizeBytes: 900, gen0Collections: 3, gen1Collections: 1, gen2Collections: 2, timeInGcPercent: 12 },
        threadPool: { workerThreads: 8, pendingWorkItemCount: 40, completedWorkItemCount: 120, availableWorkerThreads: 92, maxWorkerThreads: 100 },
        database: {
          status: 'available',
          latencyMs: 260,
          openConnections: 20,
          activeConnections: 16,
          idleConnections: 4,
          idleInTransactionConnections: 1,
          commandLatency: { sampleCount: 3, p50Ms: 8, p95Ms: 45, p99Ms: 90 },
          connectionOpenLatency: { sampleCount: 3, p50Ms: 4, p95Ms: 30, p99Ms: 60 },
          slowQueryCount: 2,
          timeoutCount: 1,
          errorCount: 1,
        },
      },
    ])

    expect(evaluateRuntimeDiagnosticsHealth(summary)).toMatchObject({
      status: 'red',
    })
  })

  it('flags DB diagnostic errors as red even when other runtime metrics are healthy', () => {
    const summary = buildDiagnosticsSnapshotSummary([
      {
        timestamp: '2026-05-05T00:00:00Z',
        process: { memoryBytes: 1000, processorCount: 8 },
        gc: { heapSizeBytes: 500, gen0Collections: 1, gen1Collections: 0, gen2Collections: 0, timeInGcPercent: 0.1 },
        threadPool: { workerThreads: 2, pendingWorkItemCount: 0, completedWorkItemCount: 20, availableWorkerThreads: 98, maxWorkerThreads: 100 },
        database: {
          status: 'available',
          latencyMs: 1,
          openConnections: 4,
          activeConnections: 1,
          idleConnections: 3,
          idleInTransactionConnections: 0,
          commandLatency: { sampleCount: 0, p50Ms: null, p95Ms: null, p99Ms: null },
          connectionOpenLatency: { sampleCount: 0, p50Ms: null, p95Ms: null, p99Ms: null },
          timeoutCount: 0,
          errorCount: 5,
        },
      },
    ])

    expect(evaluateRuntimeDiagnosticsHealth(summary)).toMatchObject({
      status: 'red',
      reason: expect.stringContaining('DB'),
    })
  })

  it('tracks DB latency metric availability instead of treating missing samples as zero latency', () => {
    const unavailableSummary = buildDiagnosticsSnapshotSummary([
      {
        timestamp: '2026-05-05T00:00:00Z',
        process: { memoryBytes: 1000, processorCount: 8 },
        gc: { heapSizeBytes: 500, gen0Collections: 1, gen1Collections: 0, gen2Collections: 0, timeInGcPercent: 0.1 },
        threadPool: { workerThreads: 2, pendingWorkItemCount: 0, completedWorkItemCount: 20, availableWorkerThreads: 98, maxWorkerThreads: 100 },
        database: {
          status: 'available',
          latencyMs: 1,
          openConnections: 4,
          activeConnections: 1,
          idleConnections: 3,
          idleInTransactionConnections: 0,
          commandLatency: { sampleCount: 0, p50Ms: null, p95Ms: null, p99Ms: null },
          connectionOpenLatency: { sampleCount: 0, p50Ms: null, p95Ms: null, p99Ms: null },
          timeoutCount: 0,
          errorCount: 0,
        },
      },
    ])

    expect(unavailableSummary.dbCommandP95Available).toBe(false)
    expect(unavailableSummary.dbCommandP99Available).toBe(false)
    expect(unavailableSummary.dbConnectionOpenP95Available).toBe(false)

    const availableSummary = buildDiagnosticsSnapshotSummary([
      {
        timestamp: '2026-05-05T00:00:01Z',
        process: { memoryBytes: 1000, processorCount: 8 },
        gc: { heapSizeBytes: 500, gen0Collections: 1, gen1Collections: 0, gen2Collections: 0, timeInGcPercent: 0.1 },
        threadPool: { workerThreads: 2, pendingWorkItemCount: 0, completedWorkItemCount: 20, availableWorkerThreads: 98, maxWorkerThreads: 100 },
        database: {
          status: 'available',
          latencyMs: 1,
          openConnections: 4,
          activeConnections: 1,
          idleConnections: 3,
          idleInTransactionConnections: 0,
          commandLatency: { sampleCount: 4, p50Ms: 3, p95Ms: 7, p99Ms: 9 },
          connectionOpenLatency: { sampleCount: 4, p50Ms: 1, p95Ms: 2, p99Ms: 4 },
          timeoutCount: 0,
          errorCount: 0,
        },
      },
    ])

    expect(availableSummary).toMatchObject({
      dbCommandP95Available: true,
      dbCommandP99Available: true,
      dbConnectionOpenP95Available: true,
      dbCommandP95Ms: { current: 7 },
      dbCommandP99Ms: { current: 9 },
      dbConnectionOpenP95Ms: { current: 2 },
    })
  })

  it('sanitizes real backend test config values to safe defaults and bounds', () => {
    expect(sanitizeRealBackendTestConfig({
      scenario: '   ',
      target: '',
      runner: '',
      rate: -10,
      peakRate: 5,
      durationSeconds: 999999,
      maxVUs: 0,
      startVUs: 50,
    })).toEqual({
      ...DEFAULT_REAL_BACKEND_TEST_CONFIG,
      rate: 1,
      peakRate: 5,
      durationSeconds: 3600,
      maxVUs: 1,
      startVUs: 1,
    })
  })

  it('describes scenario-specific real backend controls without reusing browser load-test semantics', () => {
    expect(describeRealBackendExecutionProfile({
      ...DEFAULT_REAL_BACKEND_TEST_CONFIG,
      scenario: 'public-api-spike',
      rate: 20,
      peakRate: 75,
      maxVUs: 40,
      durationSeconds: 60,
    })).toMatchObject({
      modeLabel: 'Spike arrival rate',
      rateLabel: 'Base RPS',
      showRate: true,
      showPeakRate: true,
      showStartVUs: false,
      maxVUsLabel: 'Max VUs cap',
      summary: expect.stringContaining('20 rps -> 75 rps'),
    })

    expect(describeRealBackendExecutionProfile({
      ...DEFAULT_REAL_BACKEND_TEST_CONFIG,
      scenario: 'public-api-soak',
      maxVUs: 25,
      durationSeconds: 300,
    })).toMatchObject({
      modeLabel: 'Soak VUs',
      showRate: false,
      showPeakRate: false,
      showStartVUs: false,
      maxVUsLabel: 'VUs',
      summary: expect.stringContaining('25 VUs'),
    })

    expect(describeRealBackendExecutionProfile({
      ...DEFAULT_REAL_BACKEND_TEST_CONFIG,
      scenario: 'public-api-stress',
      startVUs: 5,
      maxVUs: 80,
      durationSeconds: 120,
    })).toMatchObject({
      modeLabel: 'Stress VUs',
      showRate: false,
      showPeakRate: false,
      showStartVUs: true,
      maxVUsLabel: 'Max VUs',
      summary: expect.stringContaining('5 VUs -> 80 VUs'),
    })
  })

  it('builds real backend start payload from the selected editable Work and Study URLs', () => {
    const targets = buildLoadTestTargets({
      workSlugs: ['portfolio-api'],
      blogSlugs: ['nextjs-study'],
    }).map((target) => target.id === 'study-read'
      ? { ...target, path: ' /api/public/blogs/custom-study-target ' }
      : target)

    expect(buildRealBackendStartPayload({
      ...DEFAULT_REAL_BACKEND_TEST_CONFIG,
      scenario: 'public-api-spike',
      target: 'public-blogs-only',
      runner: 'k6',
      rate: 10,
      peakRate: 55,
      durationSeconds: 30,
      maxVUs: 10,
      startVUs: 2,
    }, targets)).toEqual({
      scenario: 'public-api-spike',
      target: 'public-blogs-only',
      runner: 'k6',
      rate: 10,
      peakRate: 55,
      durationSeconds: 30,
      maxVUs: 10,
      startVUs: 2,
      targets: [
        { id: 'study-list', label: 'Study list', path: '/api/public/blogs?page=1&pageSize=12', group: 'study' },
        { id: 'study-read', label: 'Study read', path: '/api/public/blogs/custom-study-target', group: 'study' },
      ],
    })

    expect(buildRealBackendStartPayload({
      ...DEFAULT_REAL_BACKEND_TEST_CONFIG,
      target: 'public-api-mix',
    }, targets).targets.map((target) => target.label)).toEqual([
      'Work list',
      'Work read',
      'Study list',
      'Study read',
    ])
  })

  it('marks a running real backend run as pending before k6 summary metrics are available', () => {
    expect(summarizeRealBackendRunSnapshot(
      'run-pending',
      {
        runId: 'run-pending',
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
        statusCounts: {
          '2xx': 0,
          '3xx': 0,
          '4xx': 0,
          '5xx': 0,
        },
        targetMetrics: [],
      },
      {
        runId: 'run-pending',
        status: 'running',
        metrics: [],
        targetMetrics: [],
      },
    )).toMatchObject({
      status: 'running',
      requests: 0,
      metricsPending: true,
      latencyBreakdown: {
        available: false,
        reason: expect.stringContaining('pending'),
        p95Ms: null,
        appElapsedP95Ms: null,
      },
      targetMetrics: [],
    })
  })

  it('summarizes real backend run status and metrics with latency breakdown + http counts', () => {
    const snapshot = summarizeRealBackendRunSnapshot(
      'run-42',
      {
        runId: 'run-42',
        status: 'running',
        totalRequests: 50,
        currentRps: 119.8,
        p95Ms: 88.8,
        statusCounts: {
          '2xx': 49,
          '3xx': 0,
          '4xx': 0,
          '5xx': 1,
        },
      },
      {
        runId: 'run-42',
        metrics: [
          {
            elapsedSeconds: 1.2,
            totalRequests: 50,
            currentRps: 120.45,
            p95Ms: 140,
            p99Ms: 210,
            maxMs: 340,
            statusCounts: {
              '2xx': 49,
              '3xx': 0,
              '4xx': 0,
              '5xx': 1,
            },
          },
        ],
        latencyBreakdown: {
          minMs: 10,
          p50Ms: 80,
          p95Ms: 140,
          p99Ms: 210,
          maxMs: 340,
          appElapsedP95Ms: 96,
          nginxRequestTimeP95Ms: 145,
          nginxUpstreamP95Ms: 121,
          nginxUpstreamP95Source: 'runner.http_waiting_fallback',
        },
        targetMetrics: [
          {
            targetId: 'work-read',
            targetLabel: 'Work read',
            targetPath: '/api/public/works/portfolio-api',
            group: 'work',
            requestCount: 30,
            successCount: 29,
            failureCount: 1,
            p95Ms: 155.5,
            responseBytesP95: 131072,
            receiveP95Ms: 18.4,
            dbCommandElapsedP95Ms: 6.2,
            dbCommandCountP95: 2,
            statusCounts: {
              '2xx': 29,
              '5xx': 1,
            },
          },
        ],
      },
    )

    expect(snapshot).toMatchObject({
      runId: 'run-42',
      status: 'running',
      requests: 50,
      throughputRps: 120.5,
      latencyMs: 140,
      latencyBreakdown: {
        available: true,
        minMs: 10,
        p50Ms: 80,
        p95Ms: 140,
        p99Ms: 210,
        maxMs: 340,
        appElapsedP95Ms: 96,
        nginxRequestTimeP95Ms: 145,
        nginxUpstreamP95Ms: 121,
        nginxUpstreamSource: 'payload.latencyBreakdown:runner.http_waiting_fallback',
      },
      httpCounts: {
        total: 50,
        success: 49,
        failed: 1,
        status2xx: 49,
        status5xx: 1,
      },
      targetMetrics: [
        {
          targetId: 'work-read',
          targetLabel: 'Work read',
          targetPath: '/api/public/works/portfolio-api',
          group: 'work',
          requestCount: 30,
          successCount: 29,
          failureCount: 1,
          p95Ms: 155.5,
          responseBytesP95: 131072,
          receiveP95Ms: 18.4,
          dbCommandElapsedP95Ms: 6.2,
          dbCommandCountP95: 2,
        },
      ],
    })
  })

  it('returns an unavailable latency breakdown fallback when metrics are missing', () => {
    expect(extractRealBackendLatencyBreakdown({ status: 'running' })).toMatchObject({
      available: false,
      reason: 'Latency breakdown is unavailable for this run. Current status: running.',
      minMs: null,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
      maxMs: null,
      appElapsedReason: 'ASP.NET app elapsed p95 is unavailable for status running.',
      nginxRequestTimeP95Ms: null,
      nginxUpstreamP95Ms: null,
      appElapsedP95Ms: null,
    })
  })

  it('extracts ASP.NET app elapsed metrics with status and latencyBreakdown priority', () => {
    const snapshot = extractRealBackendLatencyBreakdown(
      {
        status: {
          status: 'queued',
          metrics: {
            latencyBreakdown: {
              appElapsedMs: 250.8,
            },
          },
        },
        latencyBreakdown: {
          p50Ms: 22,
          p95Ms: 55.1,
          p99Ms: 84.2,
        },
      },
      {
        status: {
          status: 'running',
          metrics: {
            latencyBreakdown: {
              appElapsedMs: 321.6,
            },
          },
        },
        metrics: {
          appElapsedP95Ms: 555.1,
        },
        p95Ms: 66.6,
      },
    )

    expect(snapshot).toMatchObject({
      available: true,
      p95Ms: 55.1,
      appElapsedP95Ms: 250.8,
      appElapsedSource: 'status.metrics.latencyBreakdown',
      appElapsedReason: null,
      nginxRequestTimeP95Ms: null,
      nginxUpstreamP95Ms: null,
    })
  })

  it('extracts persisted diagnostics samples from real backend metrics payload', () => {
    const diagnostics = {
      timestamp: '2026-05-06T10:00:00Z',
      process: { memoryBytes: 2048, processorCount: 2 },
      gc: { heapSizeBytes: 1024, gen0Collections: 1, gen1Collections: 0, gen2Collections: 0, timeInGcPercent: 0.1 },
      threadPool: { workerThreads: 8, pendingWorkItemCount: 0, completedWorkItemCount: 200, availableWorkerThreads: 32759, maxWorkerThreads: 32767 },
      database: {
        status: 'available',
        latencyMs: 1.2,
        openConnections: 12,
        activeConnections: 2,
        idleConnections: 10,
        idleInTransactionConnections: 0,
        commandLatency: { sampleCount: 20, p50Ms: 1.1, p95Ms: 5.5, p99Ms: 8.8 },
        connectionOpenLatency: { sampleCount: 4, p50Ms: 0.5, p95Ms: 2.2, p99Ms: 3.3 },
        slowQueryCount: 0,
        recentSlowQueries: [],
        timeoutCount: 0,
        errorCount: 0,
      },
    }

    const snapshot = summarizeRealBackendRunSnapshot(
      'run-with-diagnostics',
      { status: 'completed' },
      {
        status: 'completed',
        diagnostics: [diagnostics],
        metrics: [
          {
            diagnostics,
            latencyBreakdown: { p95Ms: 11 },
          },
        ],
      },
    ) as unknown as { diagnostics?: unknown[] }

    expect(snapshot.diagnostics).toEqual([diagnostics])
  })

  it('keeps DB command p95 in real backend latency breakdown from diagnostics aggregate when the final sample is idle', () => {
    const activeDiagnostics = {
      timestamp: '2026-05-06T10:00:00Z',
      process: { memoryBytes: 2048, processorCount: 2 },
      gc: { heapSizeBytes: 1024, gen0Collections: 1, gen1Collections: 0, gen2Collections: 0, timeInGcPercent: 0.1 },
      threadPool: { workerThreads: 8, pendingWorkItemCount: 0, completedWorkItemCount: 200, availableWorkerThreads: 32759, maxWorkerThreads: 32767 },
      database: {
        status: 'available' as const,
        latencyMs: 1.2,
        openConnections: 12,
        activeConnections: 2,
        idleConnections: 10,
        idleInTransactionConnections: 0,
        commandLatency: { sampleCount: 20, p50Ms: 1.1, p95Ms: 14.4, p99Ms: 18.8 },
        connectionOpenLatency: { sampleCount: 4, p50Ms: 0.5, p95Ms: 2.2, p99Ms: 3.3 },
        slowQueryCount: 0,
        recentSlowQueries: [],
        timeoutCount: 0,
        errorCount: 0,
      },
    }
    const idleDiagnostics = {
      ...activeDiagnostics,
      timestamp: '2026-05-06T10:00:01Z',
      database: {
        ...activeDiagnostics.database,
        commandLatency: { sampleCount: 0, p50Ms: null, p95Ms: null, p99Ms: null },
      },
    }

    const snapshot = summarizeRealBackendRunSnapshot(
      'run-db-command-breakdown',
      { status: 'completed' },
      {
        status: 'completed',
        diagnostics: [activeDiagnostics, idleDiagnostics],
        latencyBreakdown: {
          minMs: 10,
          p50Ms: 20,
          p95Ms: 30,
          p99Ms: 40,
          maxMs: 50,
          appElapsedP95Ms: 25,
        },
      },
    )

    expect(snapshot.latencyBreakdown).toMatchObject({
      dbCommandP95Ms: 14.4,
      dbCommandP95Source: 'diagnostics.commandLatency.p95',
    })
  })

  it('normalizes real backend snapshot status for queued/running/completed/failed/stopped', () => {
    const cases = [
      { input: 'queued', expected: 'queued' },
      { input: 'running', expected: 'running' },
      { input: 'completed', expected: 'completed' },
      { input: 'failed', expected: 'failed' },
      { input: 'stopped', expected: 'stopped' },
      { input: 'COMPLETED', expected: 'completed' },
    ]

    for (const { input, expected } of cases) {
      const summary = summarizeRealBackendRunSnapshot(
        'run-status',
        { status: input },
        { status: input },
      )

      expect(summary.status).toBe(expected)
      expect(summary.runId).toBe('run-status')
      expect(summary.requests).toBeGreaterThanOrEqual(0)
    }
  })

  it('returns app elapsed unavailable reason for non-running statuses', () => {
    expect(extractRealBackendLatencyBreakdown({ status: 'failed' })).toMatchObject({
      available: false,
      reason: 'Latency breakdown is unavailable for this run. Current status: failed.',
      appElapsedReason: 'ASP.NET app elapsed p95 is unavailable for status failed.',
    })
  })
})
