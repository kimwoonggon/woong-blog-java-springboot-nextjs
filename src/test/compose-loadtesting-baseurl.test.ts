import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()

const composeContracts = [
  {
    composeFile: 'docker-compose.prod.yml',
    envFile: '.env.prod.example',
    fallbackOrigin: 'https://woonglab.com',
  },
  {
    composeFile: 'docker-compose.staging.yml',
    envFile: '.env.staging.example',
    fallbackOrigin: 'https://staging.example.com',
  },
]

function repoFileExists(relativePath: string) {
  return existsSync(path.join(repoRoot, relativePath))
}

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function availableComposeContracts() {
  return composeContracts.filter(({ composeFile, envFile }) => {
    const hasComposeFile = repoFileExists(composeFile)
    const hasEnvFile = repoFileExists(envFile)

    if (hasComposeFile !== hasEnvFile) {
      throw new Error(`${composeFile} and ${envFile} must be promoted together.`)
    }

    return hasComposeFile
  })
}

describe('LOAD_TESTING_BASE_URL compose contract', () => {
  const availableContracts = availableComposeContracts()

  it('always verifies the production runtime contract', () => {
    expect(availableContracts.map(({ composeFile }) => composeFile)).toContain('docker-compose.prod.yml')
  })

  it.each(availableContracts)('$composeFile defaults real backend tests to the public nginx origin', ({ composeFile, fallbackOrigin }) => {
    const compose = readRepoFile(composeFile)

    expect(compose).toContain(
      `LOAD_TESTING_BASE_URL: \${LOAD_TESTING_BASE_URL:-\${NEXT_PUBLIC_SITE_URL:-${fallbackOrigin}}}`,
    )
    expect(compose).not.toContain('LOAD_TESTING_BASE_URL: http://127.0.0.1:8080')
  })

  it.each(availableContracts)('$envFile documents the same public load-test origin default', ({ envFile, fallbackOrigin }) => {
    const envExample = readRepoFile(envFile)

    expect(envExample).toContain(`LOAD_TESTING_BASE_URL=${fallbackOrigin}`)
  })
})
