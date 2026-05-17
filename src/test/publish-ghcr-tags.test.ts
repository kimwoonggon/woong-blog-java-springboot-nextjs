import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()

function readWorkflow(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function readStepBlock(workflow: string, stepName: string) {
  const start = workflow.indexOf(`- name: ${stepName}`)
  expect(start).toBeGreaterThanOrEqual(0)

  const next = workflow.indexOf('\n      - name:', start + 1)
  return next === -1 ? workflow.slice(start) : workflow.slice(start, next)
}

describe('GHCR publish workflow image tags', () => {
  it('publishes main runtime images as the required package output and gates legacy aliases behind a package token', () => {
    const workflow = readWorkflow('.github/workflows/publish-ghcr-main.yml')
    const runtimePushStep = readStepBlock(workflow, 'Build and push ${{ matrix.image_suffix }}')

    expect(workflow).toContain('${{ steps.vars.outputs.repo_lc }}-runtime-${{ matrix.image_suffix }}:main')
    expect(workflow).toContain('${{ steps.vars.outputs.repo_lc }}-runtime-${{ matrix.image_suffix }}:sha-${{ steps.vars.outputs.sha_short }}')
    expect(workflow).toContain('${{ steps.vars.outputs.repo_lc }}-runtime-${{ matrix.image_suffix }}:latest')
    expect(workflow).toContain('${{ steps.vars.outputs.repo_lc }}-${{ matrix.image_suffix }}:main')
    expect(workflow).toContain('${{ steps.vars.outputs.repo_lc }}-${{ matrix.image_suffix }}:sha-${{ steps.vars.outputs.sha_short }}')
    expect(workflow).toContain('${{ steps.vars.outputs.repo_lc }}-${{ matrix.image_suffix }}:latest')
    expect(workflow).toContain('GHCR_PACKAGES_TOKEN')
    expect(workflow).toContain("if: ${{ env.GHCR_PACKAGES_TOKEN != '' }}")
    expect(workflow).toContain('Build and push legacy aliases')
    expect(runtimePushStep).not.toContain('${{ steps.vars.outputs.repo_lc }}-${{ matrix.image_suffix }}:main')
    expect(runtimePushStep).not.toContain('${{ steps.vars.outputs.repo_lc }}-${{ matrix.image_suffix }}:sha-${{ steps.vars.outputs.sha_short }}')
    expect(runtimePushStep).not.toContain('${{ steps.vars.outputs.repo_lc }}-${{ matrix.image_suffix }}:latest')
  })

  it('publishes dev staging runtime images as the required package output and gates legacy aliases behind a package token', () => {
    const workflow = readWorkflow('.github/workflows/publish-ghcr-dev.yml')
    const runtimePushStep = readStepBlock(workflow, 'Build and push ${{ matrix.image_suffix }}')

    expect(workflow).toContain('${{ steps.vars.outputs.repo_lc }}-runtime-${{ matrix.image_suffix }}:dev')
    expect(workflow).toContain('${{ steps.vars.outputs.repo_lc }}-runtime-${{ matrix.image_suffix }}:dev-sha-${{ steps.vars.outputs.sha_short }}')
    expect(workflow).toContain('${{ steps.vars.outputs.repo_lc }}-${{ matrix.image_suffix }}:dev')
    expect(workflow).toContain('${{ steps.vars.outputs.repo_lc }}-${{ matrix.image_suffix }}:dev-sha-${{ steps.vars.outputs.sha_short }}')
    expect(workflow).toContain('GHCR_PACKAGES_TOKEN')
    expect(workflow).toContain("if: ${{ env.GHCR_PACKAGES_TOKEN != '' }}")
    expect(workflow).toContain('Build and push legacy aliases')
    expect(runtimePushStep).not.toContain('${{ steps.vars.outputs.repo_lc }}-${{ matrix.image_suffix }}:dev')
    expect(runtimePushStep).not.toContain('${{ steps.vars.outputs.repo_lc }}-${{ matrix.image_suffix }}:dev-sha-${{ steps.vars.outputs.sha_short }}')
  })
})
