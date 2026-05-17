import { mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { TestInfo } from '@playwright/test'
import {
  attachLatencyMetrics,
  evaluateLatencyBudget,
  getLatencyMetrics,
  measureStep,
  normalizeInteractionsForBudget,
  recordApiResponseMetric,
  resolveLatencyBudget,
  resolveNamedStepBudget,
  startLatencyMetrics,
  type PerformanceBudgetConfig,
} from '../../tests/helpers/latency'

const budgetConfig: PerformanceBudgetConfig = {
  version: 1,
  defaults: {
    api: { warnMs: 300, hardMs: 600, failOnHard: false },
    testDuration: { warnMs: 10000, failOnHard: false },
    interaction: { warnMs: 150, hardMs: 250, failOnHard: false },
  },
  steps: {
    publicPagination: { warnMs: 800, hardMs: 1200, failOnHard: true },
  },
  api: [
    {
      name: 'public-api',
      method: 'GET',
      urlPattern: '/api/public/**',
      warnMs: 350,
      hardMs: 600,
      failOnHard: true,
    },
  ],
  tests: [
    {
      name: 'heavy-video',
      filePattern: '**/admin-work-video-*.spec.ts',
      warnMs: 60000,
      hardMs: 180000,
      failOnHard: false,
    },
  ],
  interactions: [
    {
      name: 'interaction-keyboard-notion',
      namePattern: 'keydown',
      filePattern: '**/ui-admin-notion-*.spec.ts',
      warnMs: 260,
      hardMs: 450,
      failOnHard: false,
    },
  ],
}

describe('E2E latency budgets', () => {
  it('resolves explicit named step budgets', () => {
    expect(resolveNamedStepBudget(budgetConfig, 'publicPagination')).toMatchObject({
      warnMs: 800,
      hardMs: 1200,
      failOnHard: true,
      name: 'publicPagination',
    })
  })

  it('matches public API budgets by method and globbed URL path', () => {
    const budget = resolveLatencyBudget(budgetConfig, {
      kind: 'api',
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/public/blogs?page=2',
    })

    expect(budget).toMatchObject({
      name: 'public-api',
      warnMs: 350,
      hardMs: 600,
      failOnHard: true,
    })
  })

  it('keeps heavy media specs measurement-only even with wide hard budgets', () => {
    const budget = resolveLatencyBudget(budgetConfig, {
      kind: 'test',
      file: '/repo/tests/admin-work-video-create-flow.spec.ts',
      title: 'video create flow',
    })

    expect(budget).toMatchObject({
      name: 'heavy-video',
      hardMs: 180000,
      failOnHard: false,
    })
  })

  it('matches interaction profile budgets by event name and file pattern', () => {
    const budget = resolveLatencyBudget(budgetConfig, {
      kind: 'interaction',
      name: 'keydown',
      file: '/repo/tests/ui-admin-notion-autosave-info.spec.ts',
      title: 'AF-042 autosave',
      target: '[data-testid="notion-editor"]',
    })

    expect(budget).toMatchObject({
      name: 'interaction-keyboard-notion',
      warnMs: 260,
      hardMs: 450,
    })
  })

  it('classifies warn and hard budget issues', () => {
    expect(evaluateLatencyBudget('step', 'next page', 900, { warnMs: 800, hardMs: 1200, failOnHard: true })).toMatchObject({
      severity: 'warn',
      failOnHard: false,
    })

    expect(evaluateLatencyBudget('step', 'next page', 1300, { warnMs: 800, hardMs: 1200, failOnHard: true })).toMatchObject({
      severity: 'hard',
      failOnHard: true,
    })
  })
})

describe('E2E interaction normalization', () => {
  it('collapses click-family duplicate events into one representative interaction', () => {
    const normalized = normalizeInteractionsForBudget([
      { name: 'pointerdown', durationMs: 176, startTimeMs: 100, source: 'performance-observer', target: '[data-testid="notion-library-trigger"]' },
      { name: 'mousedown', durationMs: 176, startTimeMs: 101, source: 'performance-observer', target: '[data-testid="notion-library-trigger"]' },
      { name: 'pointerup', durationMs: 176, startTimeMs: 128, source: 'performance-observer', target: '[data-testid="notion-library-trigger"]' },
      { name: 'mouseup', durationMs: 176, startTimeMs: 129, source: 'performance-observer', target: '[data-testid="notion-library-trigger"]' },
      { name: 'click', durationMs: 176, startTimeMs: 130, source: 'performance-observer', target: '[data-testid="notion-library-trigger"]' },
    ])

    expect(normalized).toHaveLength(1)
    expect(normalized[0]).toMatchObject({
      name: 'click',
      durationMs: 176,
      target: '[data-testid="notion-library-trigger"]',
    })
  })

  it('collapses keyboard keydown+keypress duplicates into one keyboard interaction', () => {
    const normalized = normalizeInteractionsForBudget([
      { name: 'keydown', durationMs: 232.8, startTimeMs: 200, source: 'performance-observer', target: '.ProseMirror' },
      { name: 'keypress', durationMs: 232.8, startTimeMs: 205, source: 'performance-observer', target: '.ProseMirror' },
      { name: 'keydown', durationMs: 188, startTimeMs: 480, source: 'performance-observer', target: '.ProseMirror' },
      { name: 'keypress', durationMs: 188, startTimeMs: 485, source: 'performance-observer', target: '.ProseMirror' },
    ])

    expect(normalized).toHaveLength(2)
    expect(normalized[0].name).toBe('keydown')
    expect(normalized[1].name).toBe('keydown')
  })
})

describe('E2E latency metric attachments', () => {
  it('attaches per-test latency JSON with measured steps and API failures', async () => {
    const testInfo = createTestInfo()
    startLatencyMetrics(testInfo)

    await measureStep(testInfo, 'quick step', { warnMs: 1000, hardMs: 2000, failOnHard: true }, async () => 'ready')
    recordApiResponseMetric(testInfo, {
      url: 'http://localhost:3000/api/public/blogs',
      method: 'GET',
      status: 200,
      durationMs: 650,
      startedAt: new Date().toISOString(),
      source: 'request',
    })

    await expect(attachLatencyMetrics(testInfo)).rejects.toThrow(/E2E latency budget failure/)
    const attachment = testInfo.attach.mock.calls.find(([name]) => name === 'e2e-latency.json')
    expect(attachment).toBeTruthy()
    const metrics = JSON.parse(await readFile(attachment?.[1].path as string, 'utf8'))

    expect(metrics.measuredSteps).toHaveLength(1)
    expect(metrics.apiResponses).toHaveLength(1)
    expect(metrics.budgetFailures[0]).toMatchObject({
      kind: 'api',
      severity: 'hard',
      failOnHard: true,
    })
  })

  it('keeps metrics readable before attachment', async () => {
    const testInfo = createTestInfo()
    startLatencyMetrics(testInfo)

    await measureStep(testInfo, 'quick step', { warnMs: 1000, hardMs: 2000, failOnHard: true }, async () => 'ready')

    expect(getLatencyMetrics(testInfo).measuredSteps[0]).toMatchObject({
      name: 'quick step',
      status: 'passed',
    })
  })
})

function createTestInfo() {
  const outputRoot = path.join(os.tmpdir(), `e2e-latency-test-${Date.now()}-${Math.random()}`)
  mkdirSync(outputRoot, { recursive: true })
  return {
    testId: `test-${Date.now()}-${Math.random()}`,
    title: 'latency helper test',
    file: '/repo/tests/example.spec.ts',
    project: { name: 'chromium-public' },
    expectedStatus: 'passed',
    status: 'passed',
    attach: vi.fn(async () => {}),
    outputPath: (fileName: string) => path.join(outputRoot, fileName),
  } as unknown as TestInfo & { attach: ReturnType<typeof vi.fn> }
}
