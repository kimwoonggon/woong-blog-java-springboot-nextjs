import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../..')
const scriptPath = path.join(repoRoot, 'scripts/prod-public-origin-preflight.sh')

function makeExecutable(filePath: string, content: string) {
  writeFileSync(filePath, content)
  chmodSync(filePath, 0o755)
}

type FakePublicOriginOptions = {
  includeNginxRequestTime?: boolean
  staleWorkList?: boolean
  staleWorkDetail?: boolean
}

function createFakePublicOrigin(options: FakePublicOriginOptions = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'prod-public-origin-preflight-'))
  const fakeBin = path.join(root, 'bin')
  mkdirSync(fakeBin, { recursive: true })

  const includeNginxRequestTime = options.includeNginxRequestTime ?? true
  const staleWorkList = options.staleWorkList ?? false
  const staleWorkDetail = options.staleWorkDetail ?? false

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
    -H) shift 2 ;;
    --compressed|-s|-S|-k) shift ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done
if [[ -n "$headers" ]]; then
  {
    printf 'HTTP/2 200\\r\\n'
    printf 'X-App-Elapsed-Ms: 4.2\\r\\n'
    ${includeNginxRequestTime ? "printf 'X-Nginx-Request-Time: 0.006\\r\\n'" : ':'}
    printf 'Content-Encoding: gzip\\r\\n'
    printf '\\r\\n'
  } > "$headers"
fi
if [[ -n "$output" ]]; then
  case "$url" in
    */api/health)
      printf '{"status":"ok"}' > "$output"
      ;;
    */api/public/works?page=1\\&pageSize=12)
      ${staleWorkList
        ? `cat > "$output" <<'JSON'
{"items":[{"id":"work-1","slug":"real-work","title":"Real Work","excerpt":"","category":"Graphics","period":"2026","tags":[],"thumbnailUrl":"/media/t.jpg","iconUrl":""}],"page":1,"pageSize":12,"totalItems":1,"totalPages":1}
JSON`
        : `cat > "$output" <<'JSON'
{"items":[{"id":"work-1","slug":"real-work","title":"Real Work","excerpt":"","category":"Graphics","tags":[],"thumbnailUrl":"/media/t.jpg","publishedAt":"2026-05-11T00:00:00Z"}],"page":1,"pageSize":12,"totalItems":1,"totalPages":1}
JSON`}
      ;;
    */api/public/blogs?page=1\\&pageSize=12)
      cat > "$output" <<'JSON'
{"items":[{"id":"blog-1","slug":"real-study","title":"Real Study","excerpt":"","tags":[],"coverUrl":"","publishedAt":"2026-05-11T00:00:00Z"}],"page":1,"pageSize":12,"totalItems":1,"totalPages":1}
JSON
      ;;
    */api/public/works/real-work)
      ${staleWorkDetail
        ? `cat > "$output" <<'JSON'
{"id":"work-1","slug":"real-work","title":"Real Work","excerpt":"","contentJson":{"blocks":[]},"category":"Graphics","period":"2026","tags":[],"thumbnailUrl":"","iconUrl":"","videos_version":1,"videos":[{"id":"video-1","sourceType":"hls","playbackUrl":"/media/master.m3u8","originalFileName":"video.mp4","fileSize":1234,"createdAt":"2026-05-11T00:00:00Z"}]}
JSON`
        : `cat > "$output" <<'JSON'
{"id":"work-1","slug":"real-work","title":"Real Work","excerpt":"","content":{"html":"<p>body</p>"},"category":"Graphics","period":"2026","tags":[],"thumbnailUrl":"","videos_version":1,"videos":[{"id":"video-1","sourceType":"hls","playbackUrl":"/media/master.m3u8","mimeType":"application/vnd.apple.mpegurl","sortOrder":0}]}
JSON`}
      ;;
    */api/public/blogs/real-study)
      cat > "$output" <<'JSON'
{"id":"blog-1","slug":"real-study","title":"Real Study","excerpt":"","content":{"html":"<p>body</p>"},"tags":[],"coverUrl":"","publishedAt":"2026-05-11T00:00:00Z"}
JSON
      ;;
    *)
      echo "unexpected url: $url" >&2
      exit 1
      ;;
  esac
fi
printf '200'
`)

  return { root, fakeBin }
}

function runScript(runtime: ReturnType<typeof createFakePublicOrigin>, extraEnv: Record<string, string> = {}) {
  return spawnSync('bash', [scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PATH: `${runtime.fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
      BASE_URL: 'https://woonglab.test',
      WORK_READ_PATH: '/api/public/works/real-work',
      STUDY_READ_PATH: '/api/public/blogs/real-study',
      CURL_INSECURE: '1',
      ...extraEnv,
    },
    encoding: 'utf8',
  })
}

describe('production public origin preflight script', () => {
  it('passes only when public origin exposes current contracts, timing headers, gzip, and real targets', () => {
    const runtime = createFakePublicOrigin()

    const result = runScript(runtime)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('[prod-public-origin-preflight] PASS')
    expect(result.stdout).toContain('Work list contract: current')
    expect(result.stdout).toContain('Work detail contract: current')
    expect(result.stdout).toContain('Study detail contract: current')
    expect(result.stdout).toContain('nginx request_time header: available')
    expect(result.stdout).toContain('gzip public responses: available')
  })

  it('fails when the public Work list still exposes stale hidden card fields', () => {
    const runtime = createFakePublicOrigin({ staleWorkList: true })

    const result = runScript(runtime)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('public Work list still exposes stale field')
    expect(result.stdout).not.toContain('[prod-public-origin-preflight] PASS')
  })

  it('fails when the public Work detail still exposes stale body or video admin fields', () => {
    const runtime = createFakePublicOrigin({ staleWorkDetail: true })

    const result = runScript(runtime)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('public Work detail still exposes stale field')
    expect(result.stdout).not.toContain('[prod-public-origin-preflight] PASS')
  })

  it('fails when nginx request timing is missing from public probes', () => {
    const runtime = createFakePublicOrigin({ includeNginxRequestTime: false })

    const result = runScript(runtime)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('missing X-Nginx-Request-Time')
    expect(result.stdout).not.toContain('[prod-public-origin-preflight] PASS')
  })

  it('rejects seeded or fixture read targets before probing the origin', () => {
    const runtime = createFakePublicOrigin()

    const seededResult = runScript(runtime, {
      WORK_READ_PATH: '/api/public/works/seeded-work',
      STUDY_READ_PATH: '/api/public/blogs/real-study',
    })
    expect(seededResult.status).not.toBe(0)
    expect(seededResult.stderr).toContain('WORK_READ_PATH must be a real public target')

    const fixtureResult = runScript(runtime, {
      WORK_READ_PATH: '/api/public/works/real-work',
      STUDY_READ_PATH: '/api/public/blogs/real-load-study-fixture',
    })
    expect(fixtureResult.status).not.toBe(0)
    expect(fixtureResult.stderr).toContain('STUDY_READ_PATH must be a real public target')
  })

  it('requires Work and Study read targets to point to the correct public API type', () => {
    const runtime = createFakePublicOrigin()

    const swappedWorkResult = runScript(runtime, {
      WORK_READ_PATH: '/api/public/blogs/real-study',
      STUDY_READ_PATH: '/api/public/blogs/real-study',
    })
    expect(swappedWorkResult.status).not.toBe(0)
    expect(swappedWorkResult.stderr).toContain('WORK_READ_PATH must start with /api/public/works/')

    const swappedStudyResult = runScript(runtime, {
      WORK_READ_PATH: '/api/public/works/real-work',
      STUDY_READ_PATH: '/api/public/works/real-work',
    })
    expect(swappedStudyResult.status).not.toBe(0)
    expect(swappedStudyResult.stderr).toContain('STUDY_READ_PATH must start with /api/public/blogs/')

    const externalResult = runScript(runtime, {
      WORK_READ_PATH: 'https://example.test/not-public',
      STUDY_READ_PATH: '/api/public/blogs/real-study',
    })
    expect(externalResult.status).not.toBe(0)
    expect(externalResult.stderr).toContain('WORK_READ_PATH must target /api/public/works/')
  })
})
