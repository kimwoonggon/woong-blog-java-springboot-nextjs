import { describe, expect, it, vi } from 'vitest'
import {
  checkDocker,
  checkHttpEndpoint,
  createReadinessConfig,
  runReadinessChecks,
} from '../../scripts/check-e2e-readiness.mjs'

describe('e2e readiness checks', () => {
  it('uses the documented backend port override when building default URLs', () => {
    const config = createReadinessConfig({
      BACKEND_PUBLISH_PORT: '18080',
      PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:3000',
    })

    expect(config.backendHealthUrl).toBe('http://127.0.0.1:18080/api/health')
    expect(config.frontendUrl).toBe('http://127.0.0.1:3000')
  })

  it('reports Docker Desktop WSL integration failures as a blocker', async () => {
    const result = await checkDocker({
      runCommand: vi.fn(() => {
        throw new Error('The command docker could not be found in this WSL 2 distro')
      }),
    })

    expect(result.ok).toBe(false)
    expect(result.label).toBe('Docker daemon')
    expect(result.detail).toMatch(/WSL|Docker Desktop|docker/i)
  })

  it('reports healthy local HTTP endpoints as ready', async () => {
    const result = await checkHttpEndpoint('Frontend', 'http://127.0.0.1:3000', {
      fetchImpl: vi.fn(async () => new Response('ok', { status: 200 })),
    })

    expect(result).toEqual({
      ok: true,
      label: 'Frontend',
      detail: 'http://127.0.0.1:3000 responded with 200',
    })
  })

  it('reports failed local HTTP endpoints without leaking stack traces', async () => {
    const result = await checkHttpEndpoint('Backend API', 'http://127.0.0.1:8080/api/health', {
      fetchImpl: vi.fn(async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:8080\n    at stack trace')
      }),
    })

    expect(result.ok).toBe(false)
    expect(result.label).toBe('Backend API')
    expect(result.detail).toContain('http://127.0.0.1:8080/api/health is not reachable')
    expect(result.detail).not.toMatch(/stack trace| at /i)
  })

  it('aggregates blockers before full Playwright e2e is attempted', async () => {
    const report = await runReadinessChecks({
      env: {
        PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:3000',
        E2E_BACKEND_HEALTH_URL: 'http://127.0.0.1:8080/api/health',
      },
      runCommand: vi.fn(() => '24.0.0'),
      fetchImpl: vi.fn(async (url: string | URL | Request) => {
        if (String(url).includes('8080')) {
          return new Response('down', { status: 503 })
        }
        return new Response('ok', { status: 200 })
      }),
    })

    expect(report.ready).toBe(false)
    expect(report.results).toEqual([
      { ok: true, label: 'Docker daemon', detail: 'Docker server 24.0.0 is reachable' },
      { ok: false, label: 'Backend API', detail: 'http://127.0.0.1:8080/api/health responded with 503' },
      { ok: true, label: 'Frontend', detail: 'http://127.0.0.1:3000 responded with 200' },
    ])
  })
})
