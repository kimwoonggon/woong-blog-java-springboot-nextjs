import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  collectLatencyArtifacts,
  renderMarkdownSummary,
  summarizeLatencyMetrics,
  writeLatencySummary,
} from '../../scripts/summarize-e2e-latency.mjs'

describe('E2E latency summary script', () => {
  it('collects Playwright latency artifacts recursively and ranks slow entries', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'e2e-latency-summary-'))
    await mkdir(path.join(root, 'test-a'), { recursive: true })
    const metric = {
      version: 1,
      testId: 'same-test-id',
      title: 'slow public route',
      file: 'tests/e2e-response-time.spec.ts',
      projectName: 'chromium-public',
      status: 'passed',
      testDurationMs: 1400,
      apiResponses: [{ method: 'GET', url: '/api/public/blogs', status: 200, durationMs: 450 }],
      interactions: [{ name: 'click', source: 'raf', durationMs: 180 }],
      measuredSteps: [{ name: 'Study pagination next', status: 'passed', durationMs: 900 }],
      warnings: [],
      budgetFailures: [{ severity: 'hard', kind: 'step', name: 'Study pagination next', durationMs: 1300, hardMs: 1200, failOnHard: true }],
    }
    await writeFile(path.join(root, 'test-a', 'e2e-latency.json'), JSON.stringify(metric), 'utf8')
    await mkdir(path.join(root, 'test-a', 'attachments'), { recursive: true })
    await writeFile(path.join(root, 'test-a', 'attachments', 'e2e-latency-json-copy.json'), JSON.stringify(metric), 'utf8')

    const metrics = await collectLatencyArtifacts(root)
    const summary = summarizeLatencyMetrics(metrics)

    expect(metrics).toHaveLength(1)
    expect(summary.slowestTests[0]).toMatchObject({ title: 'slow public route', durationMs: 1400 })
    expect(summary.slowestApiResponses[0]).toMatchObject({ url: '/api/public/blogs', durationMs: 450 })
    expect(summary.slowestInteractions[0]).toMatchObject({ name: 'click', durationMs: 180 })
    expect(summary.budgetFailureCount).toBe(1)
  })

  it('writes JSON and Markdown summaries', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'e2e-latency-write-'))
    await writeFile(path.join(root, 'e2e-latency.json'), JSON.stringify({
      version: 1,
      title: 'fast route',
      file: 'tests/e2e-response-time.spec.ts',
      projectName: 'chromium-public',
      status: 'passed',
      testDurationMs: 120,
      apiResponses: [],
      interactions: [],
      measuredSteps: [],
      warnings: [],
      budgetFailures: [],
    }), 'utf8')

    const { jsonPath, mdPath, summary } = await writeLatencySummary({ resultsDir: root })

    expect(summary.testCount).toBe(1)
    expect(JSON.parse(await readFile(jsonPath, 'utf8')).testCount).toBe(1)
    expect(await readFile(mdPath, 'utf8')).toContain('# E2E Latency Summary')
  })

  it('renders empty sections without malformed tables', () => {
    expect(renderMarkdownSummary({
      generatedAt: '2026-04-22T00:00:00.000Z',
      testCount: 0,
      budgetFailureCount: 0,
      warningCount: 0,
      slowestTests: [],
      slowestApiResponses: [],
      slowestInteractions: [],
      slowestMeasuredSteps: [],
      budgetFailures: [],
      warnings: [],
    })).toContain('_None._')
  })
})
