import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../..')
const scriptPath = path.join(repoRoot, 'scripts/prod-runtime-preflight.sh')

type FakeRuntimeOptions = {
  loadTestingBaseUrl?: string
  includeNginxRequestTime?: boolean
  diagnosticsSampleCount?: number
  publicWorkListContract?: 'current' | 'stale'
  publicWorkVideoContract?: 'current' | 'stale'
}

function makeExecutable(filePath: string, content: string) {
  writeFileSync(filePath, content)
  chmodSync(filePath, 0o755)
}

function createFakeRuntime(options: FakeRuntimeOptions = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'prod-runtime-preflight-'))
  const fakeBin = path.join(root, 'bin')
  const adminCookieFile = path.join(root, 'admin.cookies')
  const loadTestingBaseUrl = options.loadTestingBaseUrl ?? 'https://woonglab.test'
  const includeNginxRequestTime = options.includeNginxRequestTime ?? true
  const diagnosticsSampleCount = options.diagnosticsSampleCount ?? 12
  const publicWorkListContract = options.publicWorkListContract ?? 'current'
  const publicWorkVideoContract = options.publicWorkVideoContract ?? 'current'

  mkdirSync(fakeBin, { recursive: true })
  writeFileSync(adminCookieFile, 'admin-session')

  makeExecutable(path.join(fakeBin, 'docker'), `#!/usr/bin/env bash
set -euo pipefail
if [[ "$*" == *" config"* ]]; then
  cat <<'OUT'
services:
  backend:
    environment:
      LOAD_TESTING_BASE_URL: ${loadTestingBaseUrl}
      SPRING_PROFILES_ACTIVE: prod
      SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE: 40
OUT
  exit 0
fi
if [[ "$*" == *" ps --status running --services"* ]]; then
  printf 'backend\\nfrontend\\nnginx\\ndb\\n'
  exit 0
fi
if [[ "$*" == *" exec -T backend printenv"* ]]; then
  cat <<'OUT'
SPRING_PROFILES_ACTIVE=prod
LOAD_TESTING_BASE_URL=${loadTestingBaseUrl}
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=40
SPRING_DATASOURCE_PASSWORD=super-secret
OUT
  exit 0
fi
if [[ "$*" == *" exec -T backend sh -lc"* ]]; then
  cat <<'OUT'
processor_count=2
memory_max=8589934592
cpu_max=200000 100000
OUT
  exit 0
fi
echo "unexpected docker call: $*" >&2
exit 1
`)

  makeExecutable(path.join(fakeBin, 'curl'), `#!/usr/bin/env bash
set -euo pipefail
headers=''
output=''
url=''
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -D) headers="$2"; shift 2 ;;
    -o) output="$2"; shift 2 ;;
    -w) shift 2 ;;
    -H|-b) shift 2 ;;
    -k|-s|-S|-f|-L|-I) shift ;;
    --*) shift ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done
if [[ -n "$headers" ]]; then
  {
    printf 'HTTP/2 200\\r\\n'
    printf 'X-App-Elapsed-Ms: 4.2\\r\\n'
    ${includeNginxRequestTime ? "printf 'X-Nginx-Request-Time: 0.006\\\\r\\\\n'" : ':'}
    printf 'X-Nginx-Upstream-Time: 0.005\\r\\n'
    if [[ "$url" == *"/api/public/works"* ]]; then
      printf 'Content-Encoding: gzip\\r\\n'
    fi
    printf '\\r\\n'
  } > "$headers"
fi
if [[ -n "$output" ]]; then
  if [[ "$url" == *"/api/admin/load-test/diagnostics"* ]]; then
    cat > "$output" <<'OUT'
{"process":{"processorCount":2,"memoryBytes":200000000},"database":{"status":"available","commandLatency":{"sampleCount":${diagnosticsSampleCount},"p95Ms":5.1},"connectionOpenLatency":{"sampleCount":${diagnosticsSampleCount},"p95Ms":0.4},"pool":{"dbContextPoolSize":128,"npgsqlMaximumPoolSize":40,"npgsqlPoolLimitSource":"connection-string"}}}
OUT
  elif [[ "$url" == *"/api/public/works?page"* ]]; then
    ${publicWorkListContract === 'stale'
      ? `cat > "$output" <<'OUT'
{"items":[{"id":"work-1","slug":"real-work","title":"Real Work","excerpt":"excerpt","category":"Graphics","period":"2026","tags":[],"thumbnailUrl":"/media/t.jpg","iconUrl":""}],"page":1,"pageSize":12,"totalItems":1,"totalPages":1}
OUT`
      : `cat > "$output" <<'OUT'
{"items":[{"id":"work-1","slug":"real-work","title":"Real Work","excerpt":"excerpt","category":"Graphics","tags":[],"thumbnailUrl":"/media/t.jpg"}],"page":1,"pageSize":12,"totalItems":1,"totalPages":1}
OUT`}
  elif [[ "$url" == *"/api/public/works/"* ]]; then
    ${publicWorkVideoContract === 'stale'
      ? `cat > "$output" <<'OUT'
{"id":"work-1","slug":"video-work","title":"Video Work","excerpt":"excerpt","content":{"html":"<p>body</p>"},"category":"case-study","tags":[],"thumbnailUrl":"","iconUrl":"","videos_version":1,"videos":[{"id":"video-1","sourceType":"hls","sourceKey":"r2:videos/work/video/hls/master.m3u8","playbackUrl":"https://media.example.test/videos/work/video/hls/master.m3u8","originalFileName":"admin-name.mp4","fileSize":12345,"createdAt":"2026-05-10T00:00:00Z","sortOrder":0}]}
OUT`
      : `cat > "$output" <<'OUT'
{"id":"work-1","slug":"video-work","title":"Video Work","excerpt":"excerpt","content":{"html":"<p>body</p>"},"category":"case-study","tags":[],"thumbnailUrl":"","videos_version":1,"videos":[{"id":"video-1","sourceType":"hls","sourceKey":"r2:videos/work/video/hls/master.m3u8","playbackUrl":"https://media.example.test/videos/work/video/hls/master.m3u8","mimeType":"application/vnd.apple.mpegurl","sortOrder":0}]}
OUT`}
  else
    printf '{"status":"ok"}' > "$output"
  fi
fi
printf '200'
`)

  return { root, fakeBin, adminCookieFile }
}

function runPreflight(fakeBin: string, extraEnv: Record<string, string> = {}) {
  return spawnSync('bash', [scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
      BASE_URL: 'https://woonglab.test',
      APP_ENV_FILE: '.env.prod',
      COMPOSE_FILE: 'docker-compose.prod.yml',
      REQUIRE_ADMIN_DIAGNOSTICS: '1',
      CURL_INSECURE: '1',
      ...extraEnv,
    },
    encoding: 'utf8',
  })
}

describe('production runtime preflight script', () => {
  it('probes compose, nginx/app headers, gzip, cgroup resources, and admin diagnostics without leaking secrets', () => {
    const runtime = createFakeRuntime()

    const result = runPreflight(runtime.fakeBin, {
      ADMIN_COOKIE_FILE: runtime.adminCookieFile,
      REQUIRE_PUBLIC_WORK_VIDEO_CONTRACT: '1',
      WORK_READ_PATH: '/api/public/works/video-work',
    })

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('[prod-runtime-preflight] PASS')
    expect(result.stdout).toContain('LOAD_TESTING_BASE_URL=https://woonglab.test')
    expect(result.stdout).toContain('nginx request_time header: available')
    expect(result.stdout).toContain('app elapsed header: available')
    expect(result.stdout).toContain('gzip public response: available')
    expect(result.stdout).toContain('public Work detail contract: current')
    expect(result.stdout).toContain('db command samples: 12')
    expect(result.stdout).toContain('npgsql max pool: 40')
    expect(result.stdout).toContain('processor_count=2')
    expect(result.stdout).toContain('memory_max=8589934592')
    expect(result.stdout).not.toContain('super-secret')
    expect(result.stderr).not.toContain('super-secret')
  })

  it('fails when load testing would bypass nginx through a backend-direct URL', () => {
    const runtime = createFakeRuntime({ loadTestingBaseUrl: 'http://127.0.0.1:8080' })

    const result = runPreflight(runtime.fakeBin, { ADMIN_COOKIE_FILE: runtime.adminCookieFile })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('backend-direct')
    expect(result.stdout).not.toContain('super-secret')
    expect(result.stderr).not.toContain('super-secret')
  })

  it('fails when nginx request timing is missing from public API responses', () => {
    const runtime = createFakeRuntime({ includeNginxRequestTime: false })

    const result = runPreflight(runtime.fakeBin, { ADMIN_COOKIE_FILE: runtime.adminCookieFile })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('X-Nginx-Request-Time header is missing')
    expect(result.stdout).not.toContain('super-secret')
    expect(result.stderr).not.toContain('super-secret')
  })

  it('fails when admin diagnostics are required but DB command samples are unavailable', () => {
    const runtime = createFakeRuntime({ diagnosticsSampleCount: 0 })

    const result = runPreflight(runtime.fakeBin, { ADMIN_COOKIE_FILE: runtime.adminCookieFile })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('DB command latency samples')
    expect(result.stdout).not.toContain('super-secret')
    expect(result.stderr).not.toContain('super-secret')
  })

  it('fails when the public Work list still exposes stale hidden card fields', () => {
    const runtime = createFakeRuntime({ publicWorkListContract: 'stale' })

    const result = runPreflight(runtime.fakeBin, { ADMIN_COOKIE_FILE: runtime.adminCookieFile })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('public Work list still exposes stale field')
    expect(result.stdout).not.toContain('super-secret')
    expect(result.stderr).not.toContain('super-secret')
  })

  it('fails when required public Work contract still exposes stale hidden or admin-only fields', () => {
    const runtime = createFakeRuntime({ publicWorkVideoContract: 'stale' })

    const result = runPreflight(runtime.fakeBin, {
      ADMIN_COOKIE_FILE: runtime.adminCookieFile,
      REQUIRE_PUBLIC_WORK_VIDEO_CONTRACT: '1',
      WORK_READ_PATH: '/api/public/works/video-work',
    })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('public Work payload still exposes stale hidden/admin-only fields')
    expect(result.stdout).not.toContain('super-secret')
    expect(result.stderr).not.toContain('super-secret')
  })

  it('requires a real Work read path when public Work video contract verification is required', () => {
    const runtime = createFakeRuntime()

    const result = runPreflight(runtime.fakeBin, {
      ADMIN_COOKIE_FILE: runtime.adminCookieFile,
      REQUIRE_PUBLIC_WORK_VIDEO_CONTRACT: '1',
      WORK_READ_PATH: '',
    })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('REQUIRE_PUBLIC_WORK_VIDEO_CONTRACT=1 requires WORK_READ_PATH')
    expect(result.stdout).not.toContain('super-secret')
    expect(result.stderr).not.toContain('super-secret')
  })
})
