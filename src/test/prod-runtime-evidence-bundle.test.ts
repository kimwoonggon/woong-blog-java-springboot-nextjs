import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../..')
const scriptPath = path.join(repoRoot, 'scripts/prod-runtime-evidence-bundle.sh')

function createRuntime() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'prod-runtime-evidence-'))
  const preflightLog = path.join(root, 'preflight.log')
  const loadDir = path.join(root, 'load')
  const outputDir = path.join(root, 'bundle')

  mkdirSync(loadDir, { recursive: true })
  mkdirSync(outputDir, { recursive: true })

  return { root, preflightLog, loadDir, outputDir }
}

function writeValidEvidence(runtime: ReturnType<typeof createRuntime>) {
  writeFileSync(runtime.preflightLog, [
    '[prod-runtime-preflight] required services: backend frontend nginx db',
    '[prod-runtime-preflight] LOAD_TESTING_BASE_URL=https://woonglab.com',
    '[prod-runtime-preflight] SPRING_PROFILES_ACTIVE=prod',
    '[prod-runtime-preflight] nginx request_time header: available (0.010)',
    '[prod-runtime-preflight] app elapsed header: available (2.1)',
    '[prod-runtime-preflight] gzip public response: available',
    '[prod-runtime-preflight] public Work list contract: current',
    '[prod-runtime-preflight] public Work detail contract: current',
    '[prod-runtime-preflight] PASS',
  ].join('\n'))

  writeFileSync(path.join(runtime.loadDir, 'prod-real-load-steps-summary.json'), JSON.stringify({
    baseUrl: 'https://woonglab.com',
    cleanCeilingRps: 300,
    firstSaturationRate: 400,
    nextFocus: 'db-pool-or-resource-pressure',
    steps: [
      {
        rate: 100,
        listPageSize: 12,
        targets: {
          work_list: { path: '/api/public/works?page=1&pageSize=12' },
          work_read: { path: '/api/public/works/real-work' },
          study_list: { path: '/api/public/blogs?page=1&pageSize=12' },
          study_read: { path: '/api/public/blogs/real-study' },
        },
        http: { failedRate: 0, droppedIterations: 0, durationP95Ms: 120 },
      },
    ],
  }, null, 2))

  writeFileSync(path.join(runtime.loadDir, 'prod-real-load-steps-summary.md'), '# Production Real Load Steps Summary\n')
}

function runScript(runtime: ReturnType<typeof createRuntime>, extraEnv: Record<string, string> = {}) {
  return spawnSync('bash', [scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PREFLIGHT_LOG: runtime.preflightLog,
      REAL_LOAD_DIR: runtime.loadDir,
      OUTPUT_DIR: runtime.outputDir,
      MAIN_SHA: '5edcaf9d33497b121b271b3db7dd671f5405eba9',
      BACKEND_IMAGE_DIGEST: 'sha256:backend',
      FRONTEND_IMAGE_DIGEST: 'sha256:frontend',
      ...extraEnv,
    },
    encoding: 'utf8',
  })
}

describe('production runtime evidence bundle', () => {
  it('fails when preflight evidence is missing', () => {
    const runtime = createRuntime()
    writeValidEvidence(runtime)

    const result = runScript(runtime, { PREFLIGHT_LOG: path.join(runtime.root, 'missing-preflight.log') })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('PREFLIGHT_LOG does not exist')
  })

  it('fails when real load summary uses seed or fixture targets', () => {
    const runtime = createRuntime()
    writeValidEvidence(runtime)
    const summaryPath = path.join(runtime.loadDir, 'prod-real-load-steps-summary.json')
    const summary = JSON.parse(readFileSync(summaryPath, 'utf8'))
    summary.steps[0].targets.work_read.path = '/api/public/works/seeded-work'
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

    const result = runScript(runtime)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('real load summary contains seed/fixture target')
  })

  it('fails when real load summary uses backend-direct read targets', () => {
    const runtime = createRuntime()
    writeValidEvidence(runtime)
    const summaryPath = path.join(runtime.loadDir, 'prod-real-load-steps-summary.json')
    const summary = JSON.parse(readFileSync(summaryPath, 'utf8'))
    summary.steps[0].targets.work_read.path = 'http://backend:8080/api/public/works/real-work'
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

    const result = runScript(runtime)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('real load summary contains backend-direct target')
  })

  it('fails when real load summary has no next-slice focus', () => {
    const runtime = createRuntime()
    writeValidEvidence(runtime)
    const summaryPath = path.join(runtime.loadDir, 'prod-real-load-steps-summary.json')
    const summary = JSON.parse(readFileSync(summaryPath, 'utf8'))
    delete summary.nextFocus
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

    const result = runScript(runtime)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('real load summary nextFocus is required')
  })

  it('fails when real load summary has an unknown next-slice focus', () => {
    const runtime = createRuntime()
    writeValidEvidence(runtime)
    const summaryPath = path.join(runtime.loadDir, 'prod-real-load-steps-summary.json')
    const summary = JSON.parse(readFileSync(summaryPath, 'utf8'))
    summary.nextFocus = 'public-detail-serialization-or-db-index'
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

    const result = runScript(runtime)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('real load summary nextFocus is unknown')
  })

  it('fails when preflight evidence does not prove the public Work list contract is current', () => {
    const runtime = createRuntime()
    writeValidEvidence(runtime)
    writeFileSync(runtime.preflightLog, [
      '[prod-runtime-preflight] required services: backend frontend nginx db',
      '[prod-runtime-preflight] LOAD_TESTING_BASE_URL=https://woonglab.com',
      '[prod-runtime-preflight] SPRING_PROFILES_ACTIVE=prod',
      '[prod-runtime-preflight] nginx request_time header: available (0.010)',
      '[prod-runtime-preflight] app elapsed header: available (2.1)',
      '[prod-runtime-preflight] gzip public response: available',
      '[prod-runtime-preflight] public Work detail contract: current',
      '[prod-runtime-preflight] PASS',
    ].join('\n'))

    const result = runScript(runtime)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('preflight log is missing public Work list contract')
  })

  it('writes a manifest and tarball for valid preflight and real load evidence', () => {
    const runtime = createRuntime()
    writeValidEvidence(runtime)

    const result = runScript(runtime)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('[prod-runtime-evidence-bundle] PASS')

    const manifestPath = path.join(runtime.outputDir, 'production-runtime-evidence-manifest.json')
    const markdownPath = path.join(runtime.outputDir, 'production-runtime-evidence-summary.md')
    const tarballPath = path.join(runtime.outputDir, 'production-runtime-evidence.tar.gz')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      mainSha: string
      realLoad: { cleanCeilingRps: number; nextFocus: string; listPageSize: number }
    }

    expect(existsSync(markdownPath)).toBe(true)
    expect(existsSync(tarballPath)).toBe(true)
    expect(manifest.mainSha).toBe('5edcaf9d33497b121b271b3db7dd671f5405eba9')
    expect(manifest.realLoad.cleanCeilingRps).toBe(300)
    expect(manifest.realLoad.nextFocus).toBe('db-pool-or-resource-pressure')
    expect(manifest.realLoad.listPageSize).toBe(12)
    expect(readFileSync(markdownPath, 'utf8')).toContain('Next focus: `db-pool-or-resource-pressure`')
  })

  it('includes optional HLS smoke evidence in the returned tarball', () => {
    const runtime = createRuntime()
    writeValidEvidence(runtime)
    writeFileSync(path.join(runtime.loadDir, 'hls-smoke-summary.json'), JSON.stringify({
      status: 'failed',
      fatal: true,
      phase: 'hls-job',
      message: 'failed to process HLS',
    }, null, 2))

    const result = runScript(runtime)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)

    const tarballPath = path.join(runtime.outputDir, 'production-runtime-evidence.tar.gz')
    const listResult = spawnSync('tar', ['-tzf', tarballPath], { encoding: 'utf8' })

    expect(listResult.status, `${listResult.stdout}\n${listResult.stderr}`).toBe(0)
    expect(listResult.stdout).toContain('./hls-smoke-summary.json')
  })
})
