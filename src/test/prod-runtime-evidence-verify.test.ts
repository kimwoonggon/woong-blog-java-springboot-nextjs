import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../..')
const scriptPath = path.join(repoRoot, 'scripts/prod-runtime-evidence-verify.sh')

type RealLoadSummaryFixture = {
  baseUrl: string
  nextFocus?: string
  listPageSize?: number
  steps: Array<{
    listPageSize?: number
    targets: {
      work_list: { path: string }
      work_read: { path: string }
      study_list: { path: string }
      study_read: { path: string }
    }
  }>
}

function createEvidenceDir() {
  const evidenceDir = mkdtempSync(path.join(os.tmpdir(), 'prod-runtime-evidence-verify-'))

  writeFileSync(path.join(evidenceDir, 'prod-runtime-preflight.log'), [
    '[prod-runtime-preflight] required services: backend frontend nginx db',
    '[prod-runtime-preflight] LOAD_TESTING_BASE_URL=https://woonglab.com',
    '[prod-runtime-preflight] nginx request_time header: available (0.010)',
    '[prod-runtime-preflight] app elapsed header: available (2.1)',
    '[prod-runtime-preflight] gzip public response: available',
    '[prod-runtime-preflight] public Work list contract: current',
    '[prod-runtime-preflight] public Work detail contract: current',
    '[prod-runtime-preflight] PASS',
  ].join('\n'))

  writeFileSync(path.join(evidenceDir, 'prod-real-load-steps-summary.json'), JSON.stringify({
    baseUrl: 'https://woonglab.com',
    cleanCeilingRps: 300,
    firstSaturationRate: 400,
    nextFocus: 'app-cpu-or-serialization',
    listPageSize: 12,
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

  writeFileSync(path.join(evidenceDir, 'prod-real-load-steps-summary.md'), '# Production Real Load Steps Summary\n')
  writeFileSync(path.join(evidenceDir, 'production-runtime-evidence-manifest.json'), JSON.stringify({
    mainSha: '761e0040e1339101c4ab6007d032a0b5527ce049',
    images: {
      backendDigest: 'sha256:backend',
      frontendDigest: 'sha256:frontend',
    },
    preflight: { passed: true },
    realLoad: {
      baseUrl: 'https://woonglab.com',
      listPageSize: 12,
      stepCount: 1,
    },
  }, null, 2))
  writeFileSync(path.join(evidenceDir, 'production-runtime-evidence-summary.md'), '# Production Runtime Evidence Summary\n')

  return evidenceDir
}

function writeCurrentMainEvidenceDir(evidenceDir: string) {
  writeFileSync(path.join(evidenceDir, 'current-main-preflight.log'), [
    '[prod-runtime-preflight] required services: backend frontend nginx db',
    '[prod-runtime-preflight] LOAD_TESTING_BASE_URL=https://woonglab.com',
    '[prod-runtime-preflight] nginx request_time header: available (0.010)',
    '[prod-runtime-preflight] app elapsed header: available (2.1)',
    '[prod-runtime-preflight] gzip public response: available',
    '[prod-runtime-preflight] public Work list contract: current',
    '[prod-runtime-preflight] public Work detail contract: current',
    '[prod-runtime-preflight] PASS',
  ].join('\n'))

  writeFileSync(path.join(evidenceDir, 'prod-real-load-steps-summary.json'), JSON.stringify({
    baseUrl: 'https://woonglab.com',
    cleanCeilingRps: 300,
    firstSaturationRate: 400,
    nextFocus: 'app-cpu-or-serialization',
    listPageSize: 12,
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

  writeFileSync(path.join(evidenceDir, 'prod-real-load-steps-summary.md'), '# Production Real Load Steps Summary\n')
  writeFileSync(path.join(evidenceDir, 'current-main-evidence-manifest.json'), JSON.stringify({
    mainSha: '761e0040e1339101c4ab6007d032a0b5527ce049',
    baseUrl: 'https://woonglab.com',
    backendDigest: 'sha256:backend',
    frontendDigest: 'sha256:frontend',
    preflightLog: `${evidenceDir}/current-main-preflight.log`,
    listPageSize: 12,
    summaryJson: `${evidenceDir}/prod-real-load-steps-summary.json`,
    summaryMarkdown: `${evidenceDir}/prod-real-load-steps-summary.md`,
  }, null, 2))
}

function createCurrentMainEvidenceDir() {
  const evidenceDir = mkdtempSync(path.join(os.tmpdir(), 'current-main-evidence-verify-'))
  writeCurrentMainEvidenceDir(evidenceDir)
  return evidenceDir
}

function runVerifier(evidenceDir: string, extraEnv: Record<string, string> = {}) {
  return spawnSync('bash', [scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      EVIDENCE_DIR: evidenceDir,
      EXPECTED_MAIN_SHA: '761e0040e1339101c4ab6007d032a0b5527ce049',
      EXPECTED_BACKEND_IMAGE_DIGEST: 'sha256:backend',
      EXPECTED_FRONTEND_IMAGE_DIGEST: 'sha256:frontend',
      ...extraEnv,
    },
    encoding: 'utf8',
  })
}

function updateRealLoadSummary(evidenceDir: string, updater: (summary: RealLoadSummaryFixture) => void) {
  const summaryPath = path.join(evidenceDir, 'prod-real-load-steps-summary.json')
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8')) as RealLoadSummaryFixture
  updater(summary)
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
}

describe('production runtime evidence verifier', () => {
  it('passes for returned evidence from current main runtime and real public load targets', () => {
    const evidenceDir = createEvidenceDir()

    const result = runVerifier(evidenceDir)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('[prod-runtime-evidence-verify] PASS')
  })

  it('passes when real read targets are absolute public HTTPS URLs', () => {
    const evidenceDir = createEvidenceDir()
    updateRealLoadSummary(evidenceDir, (summary) => {
      summary.steps[0].targets.work_read.path = 'https://woonglab.com/api/public/works/real-work'
      summary.steps[0].targets.study_read.path = 'https://woonglab.com/api/public/blogs/real-study'
    })

    const result = runVerifier(evidenceDir)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('[prod-runtime-evidence-verify] PASS')
  })

  it('passes for a returned bundle output directory with a compressed evidence tarball', () => {
    const extractedEvidenceDir = createEvidenceDir()
    const bundleOutputDir = mkdtempSync(path.join(os.tmpdir(), 'prod-runtime-evidence-bundle-output-'))
    const tarballPath = path.join(bundleOutputDir, 'production-runtime-evidence.tar.gz')
    const tarResult = spawnSync('tar', ['-czf', tarballPath, '-C', extractedEvidenceDir, '.'], { encoding: 'utf8' })

    copyFileSync(
      path.join(extractedEvidenceDir, 'production-runtime-evidence-manifest.json'),
      path.join(bundleOutputDir, 'production-runtime-evidence-manifest.json'),
    )
    copyFileSync(
      path.join(extractedEvidenceDir, 'production-runtime-evidence-summary.md'),
      path.join(bundleOutputDir, 'production-runtime-evidence-summary.md'),
    )

    expect(tarResult.status, `${tarResult.stdout}\n${tarResult.stderr}`).toBe(0)

    const result = runVerifier(bundleOutputDir)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('[prod-runtime-evidence-verify] PASS')
  })

  it('passes for current-main handoff evidence with flat image digest fields', () => {
    const evidenceDir = createCurrentMainEvidenceDir()

    const result = runVerifier(evidenceDir)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('[prod-runtime-evidence-verify] PASS')
  })

  it('prioritizes a fatal HLS smoke result over the load-derived next focus', () => {
    const evidenceDir = createCurrentMainEvidenceDir()
    updateRealLoadSummary(evidenceDir, (summary) => {
      summary.nextFocus = 'db-pool-or-resource-pressure'
    })
    writeFileSync(path.join(evidenceDir, 'hls-smoke-summary.json'), JSON.stringify({
      status: 'failed',
      fatal: true,
      phase: 'hls-job',
      message: 'failed to process HLS',
    }, null, 2))

    const result = runVerifier(evidenceDir)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('recommendedSlice=hls-fatal-fix')
  })

  it('prioritizes a fatal HLS smoke result from a returned compressed evidence tarball', () => {
    const extractedEvidenceDir = createEvidenceDir()
    updateRealLoadSummary(extractedEvidenceDir, (summary) => {
      summary.nextFocus = 'app-cpu-or-serialization'
    })
    writeFileSync(path.join(extractedEvidenceDir, 'hls-smoke-summary.json'), JSON.stringify({
      status: 'error',
      fatal: false,
      phase: 'hls-job',
      message: 'failed to process HLS',
    }, null, 2))
    const returnedDir = mkdtempSync(path.join(os.tmpdir(), 'prod-runtime-evidence-hls-returned-'))
    const tarballPath = path.join(returnedDir, 'production-runtime-evidence.tar.gz')
    const tarResult = spawnSync('tar', ['-czf', tarballPath, '-C', extractedEvidenceDir, '.'], { encoding: 'utf8' })

    expect(tarResult.status, `${tarResult.stdout}\n${tarResult.stderr}`).toBe(0)

    const result = runVerifier(returnedDir)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('recommendedSlice=hls-fatal-fix')
  })

  it('passes for a current-main handoff bundle that contains a nested output directory', () => {
    const bundleOutputDir = mkdtempSync(path.join(os.tmpdir(), 'current-main-evidence-bundle-output-'))
    const evidenceDir = path.join(bundleOutputDir, 'loadtest')
    mkdirSync(evidenceDir)
    writeCurrentMainEvidenceDir(evidenceDir)

    const returnedDir = mkdtempSync(path.join(os.tmpdir(), 'current-main-evidence-returned-'))
    const tarballPath = path.join(returnedDir, 'current-main-preflight-load-evidence.tgz')
    const tarResult = spawnSync('tar', ['-czf', tarballPath, '-C', bundleOutputDir, 'loadtest'], { encoding: 'utf8' })

    expect(tarResult.status, `${tarResult.stdout}\n${tarResult.stderr}`).toBe(0)

    const result = runVerifier(returnedDir)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('[prod-runtime-evidence-verify] PASS')
  })

  it('fails when returned evidence is from a stale main SHA', () => {
    const evidenceDir = createEvidenceDir()

    const result = runVerifier(evidenceDir, { EXPECTED_MAIN_SHA: 'stale-main-sha' })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('main SHA mismatch')
  })

  it('fails when preflight evidence does not prove the public Work list contract is current', () => {
    const evidenceDir = createEvidenceDir()
    writeFileSync(path.join(evidenceDir, 'prod-runtime-preflight.log'), [
      '[prod-runtime-preflight] required services: backend frontend nginx db',
      '[prod-runtime-preflight] LOAD_TESTING_BASE_URL=https://woonglab.com',
      '[prod-runtime-preflight] nginx request_time header: available (0.010)',
      '[prod-runtime-preflight] app elapsed header: available (2.1)',
      '[prod-runtime-preflight] gzip public response: available',
      '[prod-runtime-preflight] public Work detail contract: current',
      '[prod-runtime-preflight] PASS',
    ].join('\n'))

    const result = runVerifier(evidenceDir)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('preflight log is missing public Work list contract')
  })

  it('fails when real load evidence bypasses the public nginx origin', () => {
    const evidenceDir = createEvidenceDir()
    updateRealLoadSummary(evidenceDir, (summary) => {
      summary.baseUrl = 'http://backend:8080'
    })

    const result = runVerifier(evidenceDir)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('real load summary baseUrl must use public HTTPS origin')
  })

  it('fails when real load evidence weakens list targets or uses seed data', () => {
    const evidenceDir = createEvidenceDir()
    updateRealLoadSummary(evidenceDir, (summary) => {
      summary.steps[0].listPageSize = 1
      summary.steps[0].targets.work_list.path = '/api/public/works?page=1&pageSize=1'
      summary.steps[0].targets.work_read.path = '/api/public/works/seeded-work'
    })

    const result = runVerifier(evidenceDir)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('step 1 must use listPageSize=12')
  })

  it('fails when real load evidence does not include a next-slice focus', () => {
    const evidenceDir = createEvidenceDir()
    updateRealLoadSummary(evidenceDir, (summary) => {
      delete summary.nextFocus
    })

    const result = runVerifier(evidenceDir)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('real load summary nextFocus is required')
  })

  it('fails when real load evidence includes an unknown next-slice focus', () => {
    const evidenceDir = createEvidenceDir()
    updateRealLoadSummary(evidenceDir, (summary) => {
      summary.nextFocus = 'public-detail-serialization-or-db-index'
    })

    const result = runVerifier(evidenceDir)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('real load summary nextFocus is unknown')
  })
})
