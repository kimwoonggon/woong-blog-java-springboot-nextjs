import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_RESULTS_DIR = 'test-results/playwright'
const SUMMARY_JSON = 'e2e-latency-summary.json'
const SUMMARY_MD = 'e2e-latency-summary.md'

export async function collectLatencyArtifacts(resultsDir = DEFAULT_RESULTS_DIR) {
  const files = await findLatencyArtifactFiles(resultsDir)
  const metricsByTest = new Map()

  for (const file of files) {
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8'))
      if (parsed && parsed.version === 1 && typeof parsed.title === 'string') {
        const metric = { ...parsed, artifactPath: normalizePath(file) }
        const key = parsed.testId
          ?? `${parsed.projectName ?? ''}\0${parsed.file ?? ''}\0${parsed.title}\0${parsed.startedAt ?? ''}`
        const existing = metricsByTest.get(key)
        if (!existing || metric.artifactPath.includes('/attachments/')) {
          metricsByTest.set(key, metric)
        }
      }
    } catch {
      // Ignore unrelated or partially-written files.
    }
  }

  return [...metricsByTest.values()]
}

export function summarizeLatencyMetrics(metrics) {
  const budgetFailures = metrics.flatMap((metric) =>
    (metric.budgetFailures ?? []).map((failure) => ({
      ...failure,
      testTitle: metric.title,
      file: metric.file,
      artifactPath: metric.artifactPath,
    })),
  )
  const warnings = metrics.flatMap((metric) =>
    (metric.warnings ?? []).map((warning) => ({
      ...warning,
      testTitle: metric.title,
      file: metric.file,
      artifactPath: metric.artifactPath,
    })),
  )
  const apiResponses = metrics.flatMap((metric) =>
    (metric.apiResponses ?? []).map((response) => ({
      ...response,
      testTitle: metric.title,
      file: metric.file,
    })),
  )
  const interactions = metrics.flatMap((metric) =>
    (metric.interactions ?? []).map((interaction) => ({
      ...interaction,
      testTitle: metric.title,
      file: metric.file,
    })),
  )
  const measuredSteps = metrics.flatMap((metric) =>
    (metric.measuredSteps ?? []).map((step) => ({
      ...step,
      testTitle: metric.title,
      file: metric.file,
    })),
  )

  return {
    generatedAt: new Date().toISOString(),
    testCount: metrics.length,
    budgetFailureCount: budgetFailures.length,
    warningCount: warnings.length,
    slowestTests: [...metrics]
      .sort((left, right) => (right.testDurationMs ?? 0) - (left.testDurationMs ?? 0))
      .slice(0, 20)
      .map((metric) => ({
        title: metric.title,
        file: metric.file,
        projectName: metric.projectName,
        durationMs: metric.testDurationMs ?? 0,
        status: metric.status,
      })),
    slowestApiResponses: apiResponses
      .sort((left, right) => right.durationMs - left.durationMs)
      .slice(0, 20),
    slowestInteractions: interactions
      .sort((left, right) => right.durationMs - left.durationMs)
      .slice(0, 20),
    slowestMeasuredSteps: measuredSteps
      .sort((left, right) => right.durationMs - left.durationMs)
      .slice(0, 20),
    budgetFailures,
    warnings,
  }
}

export async function writeLatencySummary({
  resultsDir = DEFAULT_RESULTS_DIR,
  outputDir = resultsDir,
} = {}) {
  const metrics = await collectLatencyArtifacts(resultsDir)
  const summary = summarizeLatencyMetrics(metrics)
  await mkdir(outputDir, { recursive: true })
  const jsonPath = path.join(outputDir, SUMMARY_JSON)
  const mdPath = path.join(outputDir, SUMMARY_MD)

  await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  await writeFile(mdPath, renderMarkdownSummary(summary), 'utf8')

  return { summary, jsonPath, mdPath }
}

export function renderMarkdownSummary(summary) {
  const lines = [
    '# E2E Latency Summary',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `- Tests with latency artifacts: ${summary.testCount}`,
    `- Budget failures: ${summary.budgetFailureCount}`,
    `- Warnings: ${summary.warningCount}`,
    '',
    '## Slowest Tests',
    '',
    renderTable(['Duration ms', 'Status', 'Project', 'Spec', 'Title'], summary.slowestTests.map((test) => [
      test.durationMs,
      test.status ?? '',
      test.projectName ?? '',
      test.file,
      test.title,
    ])),
    '',
    '## Slowest API Responses',
    '',
    renderTable(['Duration ms', 'Status', 'Method', 'URL', 'Spec'], summary.slowestApiResponses.map((api) => [
      api.durationMs,
      api.status ?? '',
      api.method,
      api.url,
      api.file,
    ])),
    '',
    '## Slowest Interactions',
    '',
    renderTable(['Duration ms', 'Name', 'Source', 'Target', 'Spec'], summary.slowestInteractions.map((interaction) => [
      interaction.durationMs,
      interaction.name,
      interaction.source,
      interaction.target ?? '',
      interaction.file,
    ])),
    '',
    '## Slowest Measured Steps',
    '',
    renderTable(['Duration ms', 'Status', 'Step', 'Spec'], summary.slowestMeasuredSteps.map((step) => [
      step.durationMs,
      step.status,
      step.name,
      step.file,
    ])),
    '',
    '## Budget Failures',
    '',
    renderTable(['Severity', 'Duration ms', 'Hard ms', 'Kind', 'Name', 'Spec'], summary.budgetFailures.map((failure) => [
      failure.severity,
      failure.durationMs,
      failure.hardMs ?? '',
      failure.kind,
      failure.name,
      failure.file,
    ])),
    '',
  ]

  return `${lines.join('\n')}\n`
}

async function findLatencyArtifactFiles(rootDir) {
  const absoluteRoot = path.resolve(rootDir)
  const results = []

  async function walk(directory) {
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }

      if (entry.isFile() && /^e2e-latency.*\.json$/i.test(entry.name)) {
        results.push(fullPath)
      }
    }
  }

  await walk(absoluteRoot)
  return results
}

function renderTable(headers, rows) {
  if (rows.length === 0) {
    return '_None._'
  }

  const headerLine = `| ${headers.map(escapeCell).join(' | ')} |`
  const divider = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`)
  return [headerLine, divider, ...body].join('\n')
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function normalizePath(value) {
  return value.replaceAll('\\', '/')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const resultsDir = process.argv[2] ?? DEFAULT_RESULTS_DIR
  writeLatencySummary({ resultsDir })
    .then(({ jsonPath, mdPath, summary }) => {
      console.log(`Wrote ${jsonPath}`)
      console.log(`Wrote ${mdPath}`)
      console.log(`Tests: ${summary.testCount}, budget failures: ${summary.budgetFailureCount}, warnings: ${summary.warningCount}`)
      if (summary.budgetFailureCount > 0) {
        process.exitCode = 1
      }
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
