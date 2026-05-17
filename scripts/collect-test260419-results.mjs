import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const root = path.join(repoRoot, 'tests', 'playwright', 'test260419')
const inventoryPath = path.join(root, 'feature-inventory.json')

function walk(directory) {
  if (!fs.existsSync(directory)) {
    return []
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/')
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
}

const inventory = JSON.parse(readIfExists(inventoryPath))
const files = walk(root)
const webms = files.filter((file) => file.endsWith('.webm')).map(rel).sort()
const traces = files.filter((file) => file.endsWith('trace.zip')).map(rel).sort()
const screenshots = files.filter((file) => file.endsWith('.png')).map(rel).sort()
const errorContexts = files.filter((file) => file.endsWith('error-context.md')).sort()
const chunkResults = readIfExists(path.join(root, 'chunk-results.tsv'))
  .trim()
  .split('\n')
  .slice(1)
  .filter(Boolean)
  .map((line) => {
    const [chunk, status] = line.split('\t')
    return { chunk, status: Number(status) }
  })

const failures = errorContexts.map((file) => {
  const directory = path.dirname(file)
  const body = readIfExists(file)
  return {
    artifactDirectory: rel(directory),
    errorContext: rel(file),
    video: fs.existsSync(path.join(directory, 'video.webm')) ? rel(path.join(directory, 'video.webm')) : null,
    screenshot: fs.existsSync(path.join(directory, 'test-failed-1.png')) ? rel(path.join(directory, 'test-failed-1.png')) : null,
    trace: fs.existsSync(path.join(directory, 'trace.zip')) ? rel(path.join(directory, 'trace.zip')) : null,
    summary: body.split('\n').find((line) => line.trim().length > 0)?.trim() ?? '',
  }
})

const manifest = {
  generatedAt: new Date().toISOString(),
  featureCount: inventory.featureCount,
  categoryCounts: inventory.categoryCounts,
  chunkResults,
  artifactCounts: {
    webm: webms.length,
    trace: traces.length,
    screenshot: screenshots.length,
    failure: failures.length,
  },
  webms,
  failures,
}

fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2))

const lines = [
  '# test260419 Result Summary',
  '',
  `Generated at: ${manifest.generatedAt}`,
  '',
  '## Counts',
  '',
  `- Feature inventory count: ${manifest.featureCount}`,
  `- WebM files: ${manifest.artifactCounts.webm}`,
  `- Failure contexts: ${manifest.artifactCounts.failure}`,
  `- Screenshots: ${manifest.artifactCounts.screenshot}`,
  `- Traces: ${manifest.artifactCounts.trace}`,
  '',
  '## Chunks',
  '',
  '| Chunk | Exit Status |',
  '| --- | ---: |',
  ...chunkResults.map((result) => `| ${result.chunk} | ${result.status} |`),
  '',
  '## Failures',
  '',
  '| Artifact Directory | Video | Trace |',
  '| --- | --- | --- |',
  ...failures.map((failure) => `| ${failure.artifactDirectory} | ${failure.video ?? '-'} | ${failure.trace ?? '-'} |`),
]

fs.writeFileSync(path.join(root, 'result-summary.md'), `${lines.join('\n')}\n`)
console.log(`Collected ${webms.length} webm files and ${failures.length} failures.`)
