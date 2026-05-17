#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

const DEFAULT_FRONTEND_URL = 'http://127.0.0.1:3000'
const DEFAULT_BACKEND_PORT = '8080'
const DEFAULT_TIMEOUT_MS = 2500

/**
 * @param {Partial<NodeJS.ProcessEnv>} [env]
 */
export function createReadinessConfig(env = process.env) {
  const backendPort = env.BACKEND_PUBLISH_PORT || DEFAULT_BACKEND_PORT

  return {
    backendHealthUrl: env.E2E_BACKEND_HEALTH_URL || `http://127.0.0.1:${backendPort}/api/health`,
    frontendUrl: env.PLAYWRIGHT_BASE_URL || DEFAULT_FRONTEND_URL,
    timeoutMs: Number.parseInt(env.E2E_READINESS_TIMEOUT_MS || '', 10) || DEFAULT_TIMEOUT_MS,
  }
}

function defaultRunCommand(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function sanitizeErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error)
  const firstLine = message.split(/\r?\n/).find((line) => line.trim())?.trim() || 'unknown error'
  return firstLine.replace(/\s+at\s+.*/i, '').trim()
}

export async function checkDocker({ runCommand = defaultRunCommand } = {}) {
  try {
    const version = runCommand('docker', ['info', '--format', '{{.ServerVersion}}'])
    return {
      ok: true,
      label: 'Docker daemon',
      detail: `Docker server ${version || 'unknown'} is reachable`,
    }
  } catch (error) {
    return {
      ok: false,
      label: 'Docker daemon',
      detail: [
        'Docker is not reachable from this shell.',
        'Enable Docker Desktop WSL integration for this distro or run the dev stack in an environment where `docker info` succeeds.',
        `Observed: ${sanitizeErrorMessage(error)}`,
      ].join(' '),
    }
  }
}

export async function checkHttpEndpoint(label, url, {
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      cache: 'no-store',
      signal: controller.signal,
    })

    if (response.ok) {
      return {
        ok: true,
        label,
        detail: `${url} responded with ${response.status}`,
      }
    }

    return {
      ok: false,
      label,
      detail: `${url} responded with ${response.status}`,
    }
  } catch {
    return {
      ok: false,
      label,
      detail: `${url} is not reachable`,
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * @param {{
 *   env?: Partial<NodeJS.ProcessEnv>,
 *   runCommand?: (command: string, args: string[]) => string,
 *   fetchImpl?: typeof fetch,
 * }} [options]
 */
export async function runReadinessChecks({
  env = process.env,
  runCommand = defaultRunCommand,
  fetchImpl = globalThis.fetch,
} = {}) {
  const config = createReadinessConfig(env)
  const results = [
    await checkDocker({ runCommand }),
    await checkHttpEndpoint('Backend API', config.backendHealthUrl, {
      fetchImpl,
      timeoutMs: config.timeoutMs,
    }),
    await checkHttpEndpoint('Frontend', config.frontendUrl, {
      fetchImpl,
      timeoutMs: config.timeoutMs,
    }),
  ]

  return {
    ready: results.every((result) => result.ok),
    config,
    results,
  }
}

function printReport(report) {
  console.log('E2E readiness check')
  console.log(`Backend health URL: ${report.config.backendHealthUrl}`)
  console.log(`Frontend URL: ${report.config.frontendUrl}`)

  for (const result of report.results) {
    console.log(`${result.ok ? '[pass]' : '[blocked]'} ${result.label}: ${result.detail}`)
  }

  if (!report.ready) {
    console.log('')
    console.log('Full Playwright e2e should not be run until every readiness check passes.')
    console.log('For alternate backend port startup, use:')
    console.log('BACKEND_PUBLISH_PORT=18080 ./scripts/dev-up.sh')
    console.log('PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- <focused specs>')
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await runReadinessChecks()
  printReport(report)
  process.exitCode = report.ready ? 0 : 1
}
