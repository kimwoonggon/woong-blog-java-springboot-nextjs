import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../..')
const scriptPath = path.join(repoRoot, 'scripts/prod-real-load-steps.sh')

function makeExecutable(filePath: string, content: string) {
  writeFileSync(filePath, content)
  chmodSync(filePath, 0o755)
}

function createFakeRuntime() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'prod-real-load-steps-'))
  const fakeBin = path.join(root, 'bin')
  const outputDir = path.join(root, 'out')
  const callLog = path.join(root, 'k6-calls.log')
  const adminCookieFile = path.join(root, 'admin.cookies')

  mkdirSync(fakeBin, { recursive: true })
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(adminCookieFile, 'admin-session')

  makeExecutable(path.join(fakeBin, 'k6'), `#!/usr/bin/env bash
set -euo pipefail
summary_export=''
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --summary-export) summary_export="$2"; shift 2 ;;
    run) shift ;;
    *) shift ;;
  esac
done
printf 'rate=%s base=%s work=%s study=%s pageSize=%s maxVus=%s\\n' "$RATE" "$BASE_URL" "$WORK_READ_PATH" "$STUDY_READ_PATH" "$LIST_PAGE_SIZE" "$MAX_VUS" >> "${callLog}"
rate_number="$RATE"
p95=$((rate_number / 2))
failed_rate="0"
failed_count="0"
dropped="0"
if [[ "$rate_number" -ge 400 ]]; then
  failed_rate="0.012"
  failed_count="12"
  dropped="3"
fi
cat > "$K6_STEP_SUMMARY_PATH" <<JSON
{
  "rate": $rate_number,
  "baseUrl": "$BASE_URL",
  "durationSeconds": $DURATION_SECONDS,
  "maxVUs": $MAX_VUS,
  "preAllocatedVUs": $PRE_ALLOCATED_VUS,
  "listPageSize": $LIST_PAGE_SIZE,
  "targets": {
    "work_list": { "path": "/api/public/works?page=1&pageSize=$LIST_PAGE_SIZE", "p95Ms": $p95, "responseBytesP95": 12000, "receiveP95Ms": 2 },
    "work_read": { "path": "$WORK_READ_PATH", "p95Ms": $((p95 + 10)), "responseBytesP95": 90000, "receiveP95Ms": 28 },
    "study_list": { "path": "/api/public/blogs?page=1&pageSize=$LIST_PAGE_SIZE", "p95Ms": $p95, "responseBytesP95": 11000, "receiveP95Ms": 2 },
    "study_read": { "path": "$STUDY_READ_PATH", "p95Ms": $((p95 + 20)), "responseBytesP95": 130000, "receiveP95Ms": 36 }
  },
  "http": {
    "requests": $((rate_number * DURATION_SECONDS)),
    "rps": $rate_number,
    "failedRate": $failed_rate,
    "failedCount": $failed_count,
    "durationP95Ms": $p95,
    "durationP99Ms": $((p95 + 40)),
    "droppedIterations": $dropped
  },
  "timing": {
    "appElapsedP95Ms": $((p95 - 5)),
    "nginxRequestP95Ms": $((p95 + 3)),
    "nginxUpstreamP95Ms": $((p95 + 2))
  }
}
JSON
if [[ -n "$summary_export" ]]; then
  printf '{"metrics":{}}' > "$summary_export"
fi
`)

  makeExecutable(path.join(fakeBin, 'curl'), `#!/usr/bin/env bash
set -euo pipefail
output=''
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -o) output="$2"; shift 2 ;;
    -b) shift 2 ;;
    -f|-s|-S|-k) shift ;;
    http*) shift ;;
    *) shift ;;
  esac
done
if [[ -n "$output" ]]; then
  cat > "$output" <<'JSON'
{"database":{"commandLatency":{"sampleCount":10,"p95Ms":6,"p99Ms":9},"connectionOpenLatency":{"sampleCount":10,"p95Ms":4},"pool":{"npgsqlMaximumPoolSize":40},"postgresConnections":{"openConnections":30,"activeConnections":4}}}
JSON
fi
`)

  return { root, fakeBin, outputDir, callLog, adminCookieFile }
}

function runScript(runtime: ReturnType<typeof createFakeRuntime>, extraEnv: Record<string, string> = {}) {
  return spawnSync('bash', [scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PATH: `${runtime.fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
      BASE_URL: 'https://woonglab.test',
      OUTPUT_DIR: runtime.outputDir,
      RATES: '200 400',
      DURATION_SECONDS: '5',
      MAX_VUS: '120',
      PRE_ALLOCATED_VUS: '40',
      WORK_READ_PATH: '/api/public/works/real-work',
      STUDY_READ_PATH: '/api/public/blogs/real-study',
      ADMIN_COOKIE_FILE: runtime.adminCookieFile,
      CURL_INSECURE: '1',
      ...extraEnv,
    },
    encoding: 'utf8',
  })
}

describe('production real load step runner', () => {
  it('generates k6 options with the declared maxVus variable', () => {
    const script = readFileSync(scriptPath, 'utf8')

    expect(script).toContain('const maxVus = Number.parseInt(__ENV.MAX_VUS')
    expect(script).toContain('maxVUs: maxVus')
    expect(script).not.toContain('\n      maxVUs,\n')
  })

  it('requires real read targets instead of silently falling back to seeded slugs', () => {
    const runtime = createFakeRuntime()

    const result = runScript(runtime, { WORK_READ_PATH: '', STUDY_READ_PATH: '' })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('WORK_READ_PATH and STUDY_READ_PATH are required')
    expect(existsSync(runtime.callLog)).toBe(false)
  })

  it('keeps list pageSize at 12 unless explicitly changed in code', () => {
    const runtime = createFakeRuntime()

    const result = runScript(runtime, { LIST_PAGE_SIZE: '1' })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('LIST_PAGE_SIZE must remain 12')
    expect(existsSync(runtime.callLog)).toBe(false)
  })

  it('rejects seeded or fixture read targets before invoking k6', () => {
    const seededWorkRuntime = createFakeRuntime()

    const seededWorkResult = runScript(seededWorkRuntime, {
      WORK_READ_PATH: '/api/public/works/seeded-work',
      STUDY_READ_PATH: '/api/public/blogs/real-study',
    })

    expect(seededWorkResult.status).not.toBe(0)
    expect(seededWorkResult.stderr).toContain('WORK_READ_PATH must be a real public target')
    expect(existsSync(seededWorkRuntime.callLog)).toBe(false)

    const fixtureStudyRuntime = createFakeRuntime()

    const fixtureStudyResult = runScript(fixtureStudyRuntime, {
      WORK_READ_PATH: '/api/public/works/real-work',
      STUDY_READ_PATH: '/api/public/blogs/real-load-study-fixture',
    })

    expect(fixtureStudyResult.status).not.toBe(0)
    expect(fixtureStudyResult.stderr).toContain('STUDY_READ_PATH must be a real public target')
    expect(existsSync(fixtureStudyRuntime.callLog)).toBe(false)
  })

  it('runs configured rate steps and writes aggregate json and markdown reports', () => {
    const runtime = createFakeRuntime()

    const result = runScript(runtime)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('[prod-real-load-steps] PASS')
    expect(readFileSync(runtime.callLog, 'utf8')).toContain('rate=200')
    expect(readFileSync(runtime.callLog, 'utf8')).toContain('rate=400')
    expect(readFileSync(runtime.callLog, 'utf8')).toContain('pageSize=12')
    expect(readFileSync(runtime.callLog, 'utf8')).toContain('work=/api/public/works/real-work')

    const aggregatePath = path.join(runtime.outputDir, 'prod-real-load-steps-summary.json')
    const markdownPath = path.join(runtime.outputDir, 'prod-real-load-steps-summary.md')
    const aggregate = JSON.parse(readFileSync(aggregatePath, 'utf8')) as {
      baseUrl: string
      cleanCeilingRps: number
      firstSaturationRate: number
      nextFocus: string
      steps: Array<{ rate: number }>
    }

    expect(existsSync(markdownPath)).toBe(true)
    expect(aggregate.baseUrl).toBe('https://woonglab.test')
    expect(aggregate.steps.map((step) => step.rate)).toEqual([200, 400])
    expect(aggregate.cleanCeilingRps).toBe(200)
    expect(aggregate.firstSaturationRate).toBe(400)
    expect(aggregate.nextFocus).toBe('db-pool-or-resource-pressure')
    expect(readFileSync(markdownPath, 'utf8')).toContain('| 400 |')
  })
})
