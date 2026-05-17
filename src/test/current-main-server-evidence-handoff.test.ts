import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()
const handoffDir = 'backend/reports/current-main-server-evidence-handoff-2026-05-12'

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

describe('current-main server evidence handoff', () => {
  it('defaults to the latest fetched origin/main instead of a hard-coded commit SHA', () => {
    const script = read(`${handoffDir}/server-current-main-preflight-load-evidence.sh`)
    const markdown = read(`${handoffDir}/current-main-server-evidence-handoff-2026-05-12.md`)
    const json = JSON.parse(read(`${handoffDir}/current-main-server-evidence-handoff-2026-05-12.json`))

    expect(script).toContain('EXPECTED_MAIN_SHA="${EXPECTED_MAIN_SHA:-}"')
    expect(script).toContain('target_main_sha="$(git rev-parse origin/main)"')
    expect(script).toContain('if [[ -n "${EXPECTED_MAIN_SHA}" ]]')
    expect(script).toContain('SHA_SHORT="${target_main_sha:0:12}"')
    expect(script).not.toMatch(/EXPECTED_MAIN_SHA="\$\{EXPECTED_MAIN_SHA:-[0-9a-f]{40}\}"/)
    expect(script).not.toMatch(/sha-[0-9a-f]{12}/)

    expect(markdown).toContain('defaults to the latest fetched `origin/main`')
    expect(markdown).toContain('Set `EXPECTED_MAIN_SHA=<40-char-sha>` only when an exact deployment pin is required')
    expect(markdown).not.toMatch(/sha-[0-9a-f]{12}/)

    expect(json.currentMainResolution).toEqual('dynamic-origin-main')
    expect(json.scriptGuarantees).toContain('Defaults to the latest fetched origin/main instead of a hard-coded commit SHA')
  })

  it('fails fast when optional expected image digests do not match resolved GHCR digests', () => {
    const script = read(`${handoffDir}/server-current-main-preflight-load-evidence.sh`)
    const markdown = read(`${handoffDir}/current-main-server-evidence-handoff-2026-05-12.md`)
    const json = JSON.parse(read(`${handoffDir}/current-main-server-evidence-handoff-2026-05-12.json`))

    expect(script).toContain('EXPECTED_FRONTEND_IMAGE_DIGEST="${EXPECTED_FRONTEND_IMAGE_DIGEST:-}"')
    expect(script).toContain('EXPECTED_BACKEND_IMAGE_DIGEST="${EXPECTED_BACKEND_IMAGE_DIGEST:-}"')
    expect(script).toContain('if [[ -n "${EXPECTED_FRONTEND_IMAGE_DIGEST}" && "${FRONTEND_DIGEST}" != "${EXPECTED_FRONTEND_IMAGE_DIGEST}" ]]')
    expect(script).toContain('if [[ -n "${EXPECTED_BACKEND_IMAGE_DIGEST}" && "${BACKEND_DIGEST}" != "${EXPECTED_BACKEND_IMAGE_DIGEST}" ]]')
    expect(script).toContain('fail "frontend image digest mismatch')
    expect(script).toContain('fail "backend image digest mismatch')

    expect(markdown).toContain('EXPECTED_BACKEND_IMAGE_DIGEST=sha256:<backend-digest>')
    expect(markdown).toContain('EXPECTED_FRONTEND_IMAGE_DIGEST=sha256:<frontend-digest>')
    expect(markdown).toContain('Fails immediately if provided expected image digests do not match the resolved GHCR manifest digests')

    expect(json.scriptGuarantees).toContain('Fails immediately if provided expected image digests do not match the resolved GHCR manifest digests')
  })
})
