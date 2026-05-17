import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('frontend performance benchmark runner', () => {
  it('writes machine and human reports with threshold classifications', () => {
    const reportDir = mkdtempSync(path.join(tmpdir(), 'frontend-performance-report-'))
    const result = spawnSync(process.execPath, [
      'scripts/benchmark-frontend-performance.mjs',
      '--self-test',
      '--report-dir',
      reportDir,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    })

    expect(result.status).toBe(0)

    const jsonPath = path.join(reportDir, 'frontend-performance-origin-dev-vs-current.json')
    const mdPath = path.join(reportDir, 'frontend-performance-origin-dev-vs-current.md')
    const htmlPath = path.join(reportDir, 'frontend-performance-origin-dev-vs-current.html')
    const report = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
      comparisons: Array<{ id: string; classification: string; deltaMedianPct: number | null }>
      areaRecommendations: Array<{ area: string; recommendation: string }>
    }

    expect(readFileSync(mdPath, 'utf8')).toContain('Origin/Dev vs Current Frontend Runtime Performance')
    expect(readFileSync(htmlPath, 'utf8')).toContain('<!doctype html>')
    expect(report.comparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'public-route.home.primary-visible',
          classification: 'Improved',
          deltaMedianPct: expect.any(Number),
        }),
        expect.objectContaining({
          id: 'pagination.study.next',
          classification: 'Regression',
        }),
        expect.objectContaining({
          id: 'admin.blog-editor.open',
          classification: 'Correctness-only improvement',
        }),
        expect.objectContaining({
          id: 'resume.browser-load',
          classification: 'Correctness-only improvement',
        }),
      ]),
    )
    expect(report.areaRecommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          area: 'Study/Works pagination',
          recommendation: expect.stringContaining('Investigate'),
        }),
      ]),
    )
  })
})
