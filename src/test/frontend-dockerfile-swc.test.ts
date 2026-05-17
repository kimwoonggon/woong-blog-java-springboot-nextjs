import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()

function readDockerfile() {
  return readFileSync(path.join(repoRoot, 'Dockerfile'), 'utf8')
}

function readStage(dockerfile: string, stageName: string) {
  const stageStart = dockerfile.indexOf(`FROM base AS ${stageName}`)
  expect(stageStart).toBeGreaterThanOrEqual(0)

  const nextStage = dockerfile.indexOf('\nFROM ', stageStart + 1)
  return nextStage === -1 ? dockerfile.slice(stageStart) : dockerfile.slice(stageStart, nextStage)
}

describe('frontend Dockerfile Next.js SWC runtime', () => {
  it('installs Alpine glibc compatibility in the build stage before next build runs', () => {
    const dockerfile = readDockerfile()
    const builderStage = readStage(dockerfile, 'builder')

    expect(builderStage).toContain('RUN apk add --no-cache libc6-compat')
    expect(builderStage.indexOf('RUN apk add --no-cache libc6-compat')).toBeLessThan(
      builderStage.indexOf('RUN npm run build'),
    )
  })
})
